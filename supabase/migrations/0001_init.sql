-- ============================================================
-- Couple's Expense Tracker — initial schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_bytes for invite codes

-- ── Types ────────────────────────────────────────────────────
create type split_type as enum ('even', 'payer_only');

-- ── Tables ───────────────────────────────────────────────────

create table couples (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  invite_code text not null unique default upper(encode(gen_random_bytes(3), 'hex')),
  created_at  timestamptz not null default now()
);

create table couple_members (
  couple_id    uuid not null references couples(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  joined_at    timestamptz not null default now(),
  primary key (couple_id, user_id)
);
create index on couple_members(user_id);

create table categories (
  id   smallint primary key generated always as identity,
  name text    not null,
  icon text    not null default ''
);

insert into categories (name, icon) values
  ('Groceries',       '🛒'),
  ('Food & Drink',    '🍽️'),
  ('Transport',       '🚗'),
  ('Rent/Bills',      '🏠'),
  ('Entertainment',   '🎬'),
  ('Health',          '💊'),
  ('Shopping',        '🛍️'),
  ('Other',           '📦');

create table expenses (
  id           uuid        primary key default gen_random_uuid(),
  couple_id    uuid        not null references couples(id) on delete cascade,
  paid_by      uuid        not null references auth.users(id),
  logged_by    uuid        not null references auth.users(id),
  amount       numeric(12,2) not null check (amount > 0),
  category     text        not null,
  description  text        not null default '',
  expense_date date        not null default current_date,
  split        split_type  not null default 'even',
  created_at   timestamptz not null default now()
);
create index on expenses(couple_id, expense_date desc);
create index on expenses(couple_id, paid_by);

-- ── Helper: get couple_id for the calling user ───────────────
create or replace function get_my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id
  from   couple_members
  where  user_id = auth.uid()
  limit  1;
$$;

-- ── RLS ──────────────────────────────────────────────────────
alter table couples         enable row level security;
alter table couple_members  enable row level security;
alter table expenses        enable row level security;

-- couples: members can read their own couple; no client-side insert/update
-- (couples are created via the join flow function below)
create policy "members can view own couple"
  on couples for select
  using (id = get_my_couple_id());

-- couple_members: each user sees only rows for their couple
create policy "members can view own couple_members"
  on couple_members for select
  using (couple_id = get_my_couple_id());

create policy "user can insert themselves into a couple"
  on couple_members for insert
  with check (user_id = auth.uid());

-- expenses: full CRUD scoped to couple
create policy "members can view couple expenses"
  on expenses for select
  using (couple_id = get_my_couple_id());

create policy "members can insert couple expenses"
  on expenses for insert
  with check (couple_id = get_my_couple_id() and logged_by = auth.uid());

create policy "members can update couple expenses"
  on expenses for update
  using (couple_id = get_my_couple_id())
  with check (couple_id = get_my_couple_id());

create policy "members can delete couple expenses"
  on expenses for delete
  using (couple_id = get_my_couple_id());

-- categories is read-only reference data; no RLS needed
-- (no sensitive data, same for all users)
alter table categories disable row level security;
grant select on categories to anon, authenticated;

-- ── RPC: create_couple ────────────────────────────────────────
-- Creates a couple and adds the calling user as the first member.
create or replace function create_couple(couple_name text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  insert into couples (name)
  values (couple_name)
  returning id into v_couple_id;

  insert into couple_members (couple_id, user_id, display_name)
  values (v_couple_id, auth.uid(), display_name);

  return v_couple_id;
end;
$$;

-- ── RPC: join_couple ─────────────────────────────────────────
-- Adds the calling user to an existing couple via invite code.
create or replace function join_couple(code text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple_id uuid;
begin
  select id into v_couple_id
  from   couples
  where  upper(invite_code) = upper(code)
  limit  1;

  if v_couple_id is null then
    raise exception 'invalid_invite_code';
  end if;

  if (select count(*) from couple_members where couple_id = v_couple_id) >= 2 then
    raise exception 'couple_full';
  end if;

  insert into couple_members (couple_id, user_id, display_name)
  values (v_couple_id, auth.uid(), display_name)
  on conflict do nothing;

  return v_couple_id;
end;
$$;

-- ── View: monthly_balance ─────────────────────────────────────
-- Returns one row per member per month with their share of
-- even-split expenses vs what they actually paid, and the net
-- amount they are owed (positive) or owe (negative).
create or replace view monthly_balance as
with even_expenses as (
  select
    couple_id,
    date_trunc('month', expense_date) as month,
    sum(amount)                        as total,
    sum(amount) / 2                    as each_owes
  from expenses
  where split = 'even'
  group by couple_id, date_trunc('month', expense_date)
),
paid_per_member as (
  select
    couple_id,
    paid_by                             as user_id,
    date_trunc('month', expense_date)   as month,
    sum(case when split = 'even' then amount else 0 end) as paid_even
  from expenses
  group by couple_id, paid_by, date_trunc('month', expense_date)
)
select
  p.couple_id,
  p.user_id,
  p.month,
  coalesce(e.each_owes, 0)            as owes,
  coalesce(p.paid_even, 0)            as paid,
  coalesce(p.paid_even, 0)
    - coalesce(e.each_owes, 0)        as net  -- positive = owed money, negative = owes money
from paid_per_member p
left join even_expenses e
  on e.couple_id = p.couple_id and e.month = p.month;

-- Grant access to the view for authenticated users
-- (RLS on the underlying expenses table still filters rows)
grant select on monthly_balance to authenticated;

-- ── RPC: get_monthly_balance ──────────────────────────────────
-- Client-safe wrapper: returns the balance for the calling user's
-- couple for the given month (defaults to current month).
create or replace function get_monthly_balance(target_month date default date_trunc('month', current_date)::date)
returns table (
  user_id   uuid,
  display_name text,
  owes      numeric,
  paid      numeric,
  net       numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mb.user_id,
    cm.display_name,
    mb.owes,
    mb.paid,
    mb.net
  from monthly_balance mb
  join couple_members cm on cm.user_id = mb.user_id and cm.couple_id = mb.couple_id
  where mb.couple_id = get_my_couple_id()
    and mb.month = date_trunc('month', target_month)::timestamptz;
$$;

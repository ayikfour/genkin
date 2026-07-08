-- ============================================================
-- Solo-by-default spaces: rename couples/couple_members to
-- spaces/space_members, and move expenses/budgets/recurring_expenses
-- from space-scoped visibility (couple_id column + RLS equality) to
-- an ownership + visibility-sharing model: each row is owned by a
-- user (paid_by, falling back to logged_by for legacy import rows
-- with no paid_by yet, for expenses; user_id directly for budgets;
-- paid_by directly for recurring_expenses), and RLS grants access to
-- your own rows plus rows owned by anyone in your current space.
--
-- This means leaving or switching spaces never requires copying
-- data — a user's own rows are always theirs; only who else can see
-- them changes. See CLAUDE.md "Architecture at a glance" for the
-- resulting mental model.
--
-- Also adds join_space()'s "switch spaces" behavior (detach from
-- your current space before joining a new one) and a new
-- leave_space() RPC. Settle-up (split column, get_monthly_balance())
-- was already removed in 0003_remove_split.sql — nothing to do here.
--
-- Run this in: Supabase Dashboard → SQL Editor → Run
--
-- IMPORTANT: run manually on BOTH Supabase projects, dev first:
--   1. genkin-dev  (nvoevzkqaczhvttfdvqh) — test here first
--   2. genkin      (production, oizxibiwrmpxdleqhllw) — only after
--      verifying dev works correctly
-- There is no automated migration runner in this project; see
-- CLAUDE.md "Environments" section.
--
-- Ordering matters throughout this file: Postgres blocks dropping a
-- column that's still referenced by a policy, and `language sql`
-- function bodies are plain text re-resolved per call (not OID-bound
-- like policy expressions), so get_my_couple_id()'s body must be
-- fixed in place *before* anything else could break it by relying on
-- names that no longer exist.
-- ============================================================

-- ── 1. Rename couples/couple_members to spaces/space_members ────
alter table couples rename to spaces;
alter table couple_members rename to space_members;
alter table space_members rename column couple_id to space_id;

-- ── 2. Fix get_my_couple_id()'s body in place, then rename it ───
-- Every existing policy on spaces/space_members/expenses/budgets/
-- recurring_expenses calls this function by OID (not by re-parsing
-- its name at use-site), so redefining its body and then renaming
-- the function itself is safe at any point and never breaks an
-- existing policy mid-migration.
create or replace function get_my_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select space_id
  from   space_members
  where  user_id = auth.uid()
  limit  1;
$$;

alter function get_my_couple_id() rename to get_my_space_id;

-- ── 3. New helper: is_space_mate ─────────────────────────────────
-- True for the calling user's own id (they're a member of their own
-- space) and for anyone who currently shares their space — the one
-- predicate both "my own rows" and "my space-mate's rows" need.
create or replace function is_space_mate(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from space_members
    where space_id = get_my_space_id()
      and user_id = target_user
  );
$$;

-- ── 4. spaces / space_members: rename policies, add delete policy ──
alter policy "members can view own couple" on spaces rename to "members can view own space";
alter policy "members can update own couple" on spaces rename to "members can update own space";

alter policy "members can view own couple_members" on space_members rename to "members can view own space_members";
alter policy "user can insert themselves into a couple" on space_members rename to "user can insert themselves into a space";
-- "members can update own membership" (added in 0013) already has this
-- exact name — nothing to rename here.

create policy "user can delete own membership"
  on space_members for delete
  using (user_id = auth.uid());

-- ── 5. expenses: drop space-scoped policies + column, add ownership-based ones ──
drop policy "members can view couple expenses" on expenses;
drop policy "members can insert couple expenses" on expenses;
drop policy "members can update couple expenses" on expenses;
drop policy "members can delete couple expenses" on expenses;

alter table expenses drop column couple_id;

create index expenses_owner_date_idx on expenses (coalesce(paid_by, logged_by), expense_date desc);

create policy "space members can view visible expenses"
  on expenses for select
  using (is_space_mate(coalesce(paid_by, logged_by)));

create policy "space members can insert expenses for space mates"
  on expenses for insert
  with check (logged_by = auth.uid() and is_space_mate(coalesce(paid_by, logged_by)));

create policy "space members can update visible expenses"
  on expenses for update
  using (is_space_mate(coalesce(paid_by, logged_by)))
  with check (is_space_mate(coalesce(paid_by, logged_by)));

create policy "space members can delete visible expenses"
  on expenses for delete
  using (is_space_mate(coalesce(paid_by, logged_by)));

-- ── 6. budgets: drop space-scoped policies + column, simplify PK ──
drop policy "members can view own couple budgets" on budgets;
drop policy "user can insert their own budget" on budgets;
drop policy "user can update their own budget" on budgets;

drop index if exists budgets_user_month_idx;
alter table budgets drop constraint budgets_pkey;
alter table budgets drop column couple_id;
alter table budgets add primary key (user_id, effective_month);

create policy "space members can view visible budgets"
  on budgets for select
  using (is_space_mate(user_id));

create policy "user can insert their own budget"
  on budgets for insert
  with check (user_id = auth.uid());

create policy "user can update their own budget"
  on budgets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── 7. recurring_expenses: drop space-scoped policies + column ──
drop policy "members can view couple recurring expenses" on recurring_expenses;
drop policy "members can insert couple recurring expenses" on recurring_expenses;
drop policy "members can update couple recurring expenses" on recurring_expenses;
drop policy "members can delete couple recurring expenses" on recurring_expenses;

drop index if exists recurring_expenses_due_idx;
alter table recurring_expenses drop column couple_id;
create index recurring_expenses_due_idx on recurring_expenses (paid_by, active, next_due_date);

create policy "space members can view visible recurring expenses"
  on recurring_expenses for select
  using (is_space_mate(paid_by));

create policy "space members can insert recurring expenses for space mates"
  on recurring_expenses for insert
  with check (created_by = auth.uid() and is_space_mate(paid_by));

create policy "space members can update visible recurring expenses"
  on recurring_expenses for update
  using (is_space_mate(paid_by))
  with check (is_space_mate(paid_by));

create policy "space members can delete visible recurring expenses"
  on recurring_expenses for delete
  using (is_space_mate(paid_by));

-- ── 8. create_space / join_space / leave_space ───────────────────
drop function if exists create_couple(text, text);
drop function if exists join_couple(text, text);

create or replace function create_space(space_name text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space_id uuid;
begin
  insert into spaces (name)
  values (space_name)
  returning id into v_space_id;

  insert into space_members (space_id, user_id, display_name)
  values (v_space_id, auth.uid(), display_name);

  return v_space_id;
end;
$$;

-- Adds the calling user to an existing space via invite code. Also
-- doubles as "switch spaces": if the caller already belongs to a
-- space (always true under the solo-by-default invariant; handled
-- defensively here regardless), they're detached from it first — and
-- the old space is deleted if that leaves it with zero members.
-- Nothing needs to be copied: expenses/budgets/recurring_expenses
-- are owned by the user, not the space, so a user's own history is
-- untouched by this — only who else can see it changes.
create or replace function join_space(code text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_space_id uuid;
  v_old_space_id uuid;
  v_other_member uuid;
  v_remaining int;
begin
  select id into v_target_space_id
  from   spaces
  where  upper(invite_code) = upper(code)
  limit  1;

  if v_target_space_id is null then
    raise exception 'invalid_invite_code';
  end if;

  select space_id into v_old_space_id
  from space_members where user_id = auth.uid();

  if v_old_space_id = v_target_space_id then
    raise exception 'already_in_this_space';
  end if;

  if (select count(*) from space_members where space_id = v_target_space_id) >= 2 then
    raise exception 'space_full';
  end if;

  -- Capture the target space's existing member before we mutate
  -- membership, so we can backfill any placeholder rows they logged
  -- for a not-yet-existing partner (see the update below).
  select user_id into v_other_member
  from space_members where space_id = v_target_space_id limit 1;

  if v_old_space_id is not null then
    delete from space_members where space_id = v_old_space_id and user_id = auth.uid();

    select count(*) into v_remaining from space_members where space_id = v_old_space_id;
    if v_remaining = 0 then
      delete from spaces where id = v_old_space_id;
    end if;
  end if;

  insert into space_members (space_id, user_id, display_name)
  values (v_target_space_id, auth.uid(), display_name)
  on conflict do nothing;

  -- Same intent as the backfill in 0010_fix_paid_by_backfill.sql:
  -- any row the existing member logged with no paid_by yet (a CSV
  -- import placeholder for a partner who didn't have an account)
  -- has exactly one possible owner now that I've joined.
  update expenses
  set paid_by = auth.uid(), paid_by_label = null
  where paid_by is null
    and logged_by = v_other_member;

  return v_target_space_id;
end;
$$;

-- Leaves the calling user's current space and lands them in a fresh
-- solo space under the same display name. If leaving empties the
-- old space, it's deleted (cascades to its now-empty space_members
-- row only — expenses/budgets/recurring_expenses don't reference
-- space_id at all anymore, so there's nothing else to clean up).
create or replace function leave_space()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_space_id uuid;
  v_display_name text;
  v_remaining int;
begin
  select space_id, display_name into v_old_space_id, v_display_name
  from space_members where user_id = auth.uid();

  if v_old_space_id is null then
    raise exception 'not_in_a_space';
  end if;

  delete from space_members where space_id = v_old_space_id and user_id = auth.uid();

  select count(*) into v_remaining from space_members where space_id = v_old_space_id;
  if v_remaining = 0 then
    delete from spaces where id = v_old_space_id;
  end if;

  return create_space(v_display_name || '''s space', v_display_name);
end;
$$;

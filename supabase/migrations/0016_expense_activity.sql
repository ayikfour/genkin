-- ============================================================
-- Expense activity feed: append-only audit trail for the new
-- Feed page. Every insert/update/delete on `expenses` is captured
-- automatically by a trigger — nothing changes at the three
-- existing mutation call sites (AddExpenseSheet's insert/update,
-- LogPage's single + bulk delete). `expense_id` deliberately has
-- no foreign key: a 'deleted' row must survive the expense row
-- being deleted (a cascading FK would erase the very row
-- documenting the deletion; a blocking FK would prevent the
-- delete from succeeding at all).
--
-- Also adds space_members.feed_last_seen_at, used by the Log
-- page's "new activity" nudge card to know whether the current
-- user has already visited the Feed page since the latest
-- activity from their space-mate. Nullable/no default — null
-- means "never visited". Note this resets to null whenever
-- join_space()/leave_space() delete-and-recreate a user's
-- space_members row on a space switch, which will make the nudge
-- briefly reappear post-switch even for already-seen activity.
-- Accepted as a rare, harmless edge case.
--
-- Run this in: Supabase Dashboard → SQL Editor → Run
--
-- IMPORTANT: run manually on BOTH Supabase projects, dev first:
--   1. genkin-dev  (nvoevzkqaczhvttfdvqh) — test here first
--   2. genkin      (production, oizxibiwrmpxdleqhllw) — only after
--      verifying dev works correctly
-- There is no automated migration runner in this project; see
-- CLAUDE.md "Environments" section.
-- ============================================================

-- ── 1. expense_activity table ────────────────────────────────
create table expense_activity (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null,
  actor_id   uuid not null references auth.users(id),
  action     text not null check (action in ('created', 'updated', 'deleted')),
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()
);

create index expense_activity_actor_created_idx
  on expense_activity (actor_id, created_at desc);

-- ── 2. Trigger function: snapshot every expenses mutation ────
-- security definer is required: expense_activity has no INSERT
-- policy for `authenticated` at all (see step 4), so only this
-- function — which always reads auth.uid() itself and can't be
-- told to claim a different actor — can ever write to it.
create or replace function log_expense_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into expense_activity (expense_id, actor_id, action, new_data)
    values (
      new.id, auth.uid(), 'created',
      jsonb_build_object(
        'amount', new.amount,
        'category', new.category,
        'description', new.description,
        'expense_date', new.expense_date,
        'paid_by', new.paid_by,
        'recurring_expense_id', new.recurring_expense_id
      )
    );
    return new;

  elsif tg_op = 'UPDATE' then
    if new.amount is not distinct from old.amount
       and new.category is not distinct from old.category
       and new.description is not distinct from old.description
       and new.expense_date is not distinct from old.expense_date
       and new.paid_by is not distinct from old.paid_by
       and new.recurring_expense_id is not distinct from old.recurring_expense_id
    then
      return new;
    end if;

    insert into expense_activity (expense_id, actor_id, action, old_data, new_data)
    values (
      new.id, auth.uid(), 'updated',
      jsonb_build_object(
        'amount', old.amount,
        'category', old.category,
        'description', old.description,
        'expense_date', old.expense_date,
        'paid_by', old.paid_by,
        'recurring_expense_id', old.recurring_expense_id
      ),
      jsonb_build_object(
        'amount', new.amount,
        'category', new.category,
        'description', new.description,
        'expense_date', new.expense_date,
        'paid_by', new.paid_by,
        'recurring_expense_id', new.recurring_expense_id
      )
    );
    return new;

  elsif tg_op = 'DELETE' then
    insert into expense_activity (expense_id, actor_id, action, old_data)
    values (
      old.id, auth.uid(), 'deleted',
      jsonb_build_object(
        'amount', old.amount,
        'category', old.category,
        'description', old.description,
        'expense_date', old.expense_date,
        'paid_by', old.paid_by,
        'recurring_expense_id', old.recurring_expense_id
      )
    );
    return old;
  end if;

  return null;
end;
$$;

create trigger expenses_activity_trigger
  after insert or update or delete on expenses
  for each row execute function log_expense_activity();

-- ── 3. RLS: visible to space mates of the actor, no direct writes ──
alter table expense_activity enable row level security;

create policy "space members can view visible activity"
  on expense_activity for select
  using (is_space_mate(actor_id));

-- No insert/update/delete policy for `authenticated` — RLS
-- defaults to deny per-command when no policy exists, so only the
-- security definer trigger above can write to this table.

-- ── 4. space_members.feed_last_seen_at ───────────────────────
alter table space_members add column feed_last_seen_at timestamptz;

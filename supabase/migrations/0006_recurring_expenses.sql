-- ============================================================
-- Recurring expenses: template table + link column on expenses
-- Run this in: Supabase Dashboard → SQL Editor → Run
--
-- IMPORTANT: run manually on BOTH Supabase projects, dev first:
--   1. genkin-dev  (nvoevzkqaczhvttfdvqh) — test here first
--   2. genkin      (production, oizxibiwrmpxdleqhllw) — only after
--      verifying dev works correctly
-- There is no automated migration runner in this project; see
-- CLAUDE.md "Environments" section.
--
-- There's no scheduled-job infra in this project (no pg_cron, no
-- Edge Functions, no Vercel/Netlify cron) and none is being added
-- here to stay on the $0/month tier. Recurrence is materialized
-- lazily by the client: whoever opens the app next creates any
-- expense rows that have come due since the last visit. See
-- src/lib/recurringExpenses.ts.
-- ============================================================

create table recurring_expenses (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references couples(id) on delete cascade,
  paid_by       uuid not null references auth.users(id),
  created_by    uuid not null references auth.users(id),
  amount        numeric(12,2) not null check (amount > 0),
  category      text not null,
  description   text not null default '',
  frequency     text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  start_date    date not null,
  next_due_date date not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index recurring_expenses_due_idx on recurring_expenses(couple_id, active, next_due_date);

alter table expenses add column recurring_expense_id uuid references recurring_expenses(id) on delete set null;

-- Guards against duplicate occurrences if both partners' apps race to
-- materialize the same due date at once (there's no server-side lock,
-- since this all runs client-side) — the second insert for the same
-- (template, date) pair fails and is treated as "already created".
create unique index expenses_recurring_occurrence_uq
  on expenses (recurring_expense_id, expense_date)
  where recurring_expense_id is not null;

-- ── RLS ──────────────────────────────────────────────────────
alter table recurring_expenses enable row level security;

create policy "members can view couple recurring expenses"
  on recurring_expenses for select
  using (couple_id = get_my_couple_id());

create policy "members can insert couple recurring expenses"
  on recurring_expenses for insert
  with check (couple_id = get_my_couple_id() and created_by = auth.uid());

create policy "members can update couple recurring expenses"
  on recurring_expenses for update
  using (couple_id = get_my_couple_id())
  with check (couple_id = get_my_couple_id());

create policy "members can delete couple recurring expenses"
  on recurring_expenses for delete
  using (couple_id = get_my_couple_id());

-- ── Realtime ─────────────────────────────────────────────────
-- So the Upcoming list on the Log page updates live for both
-- partners, same as expenses (see 0002_realtime.sql).
alter publication supabase_realtime add table recurring_expenses;

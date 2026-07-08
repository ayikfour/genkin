-- ============================================================
-- Fix the paid_by_label backfill in join_couple(): the old
-- backfill (0008_paid_by_placeholder.sql) only attributed an
-- imported row to a newly-joined partner when their chosen
-- display_name matched the CSV's payer name exactly
-- (case-insensitive). If the partner joins under a different
-- name than the one recorded in the CSV, that match silently
-- fails and the row is stuck with paid_by = null forever — which
-- also makes it silently drop out of every per-person stat
-- (see src/lib/budgetSummary.ts, which only sums rows with a
-- non-null paid_by).
-- Run this in: Supabase Dashboard → SQL Editor → Run
--
-- IMPORTANT: run manually on BOTH Supabase projects, dev first:
--   1. genkin-dev  (nvoevzkqaczhvttfdvqh) — test here first
--   2. genkin      (production, oizxibiwrmpxdleqhllw) — only after
--      verifying dev works correctly
-- There is no automated migration runner in this project; see
-- CLAUDE.md "Environments" section.
-- ============================================================

-- ── Redefine join_couple(): drop the name-matching condition ──
-- A couple is capped at 2 members (see the couple_full check
-- below) and CSV import always resolves the importer's own rows
-- to their own user_id immediately (src/pages/ImportPage.tsx),
-- never leaving them null. So once a second member joins, any
-- remaining paid_by-null row in that couple has exactly one
-- possible owner: the member who just joined. No name matching
-- needed — and none of the fragility that comes with it (a
-- partner's chosen display_name at join time has no reason to
-- match whatever name happened to be typed into the CSV).
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

  update expenses
  set paid_by = auth.uid(), paid_by_label = null
  where couple_id = v_couple_id
    and paid_by is null;

  return v_couple_id;
end;
$$;

-- ── One-time retroactive reconciliation ─────────────────────
-- Fixes couples where the old name-matching backfill already ran
-- (at join time) and missed rows because of a mismatched display
-- name — the join event has already fired for them, so the
-- function fix above can't reach their existing data on its own.
-- Only touches couples that currently have exactly 2 members: in
-- that state, for any row with paid_by is null, the member who is
-- NOT the row's logged_by (the person who ran the import) is the
-- only remaining candidate — logged_by is never null and the
-- importer's own rows are never left unattributed.
update expenses e
set paid_by = m2.user_id, paid_by_label = null
from couple_members m2
where e.couple_id = m2.couple_id
  and e.paid_by is null
  and m2.user_id <> e.logged_by
  and m2.couple_id in (
    select couple_id from couple_members group by couple_id having count(*) = 2
  );

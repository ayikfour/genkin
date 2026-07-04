-- ============================================================
-- Allow expenses to be attributed to a partner who hasn't joined
-- the couple yet (needed for CSV import of historical data logged
-- before both partners had an account). expenses.paid_by becomes
-- optional; paid_by_label stores the plain-text name to fall back
-- to. Once the real partner joins under that same display name,
-- join_couple() automatically backfills their rows.
-- Run this in: Supabase Dashboard → SQL Editor → Run
--
-- IMPORTANT: run manually on BOTH Supabase projects, dev first:
--   1. genkin-dev  (nvoevzkqaczhvttfdvqh) — test here first
--   2. genkin      (production, oizxibiwrmpxdleqhllw) — only after
--      verifying dev works correctly
-- There is no automated migration runner in this project; see
-- CLAUDE.md "Environments" section.
-- ============================================================

alter table expenses alter column paid_by drop not null;
alter table expenses add column paid_by_label text;
alter table expenses add constraint expenses_paid_by_or_label_chk
  check (paid_by is not null or paid_by_label is not null);

-- ── Redefine join_couple to backfill placeholder rows on join ──
-- Same body as 0001_init.sql, plus a backfill step at the end:
-- any expense in this couple that has no paid_by yet, and whose
-- paid_by_label matches (case-insensitively) the name the new
-- member is joining under, gets attributed to their real account.
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
    and paid_by is null
    and lower(paid_by_label) = lower(display_name);

  return v_couple_id;
end;
$$;

-- ============================================================
-- Add missing UPDATE policy on couples
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- Must be run on BOTH genkin-dev and genkin (production) projects.
--
-- couples had RLS enabled with only a SELECT policy (0001_init.sql) — any
-- UPDATE (e.g. the currency setting added in 0004) silently affects zero
-- rows instead of erroring, since RLS defaults to deny per-command when no
-- policy exists for that command.
-- ============================================================

create policy "members can update own couple"
  on couples for update
  using (id = get_my_couple_id())
  with check (id = get_my_couple_id());

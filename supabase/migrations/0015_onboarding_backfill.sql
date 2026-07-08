-- ============================================================
-- Backfill onboarding_completed=true for every pre-existing user, so
-- the new first-run onboarding walkthrough (added alongside this
-- migration — see src/pages/OnboardingPage.tsx) only shows for
-- brand-new signups going forward, not for anyone who already has an
-- established space/history.
--
-- onboarding_completed lives in auth.users.raw_user_meta_data
-- (Supabase's user_metadata) rather than any table in the public
-- schema — space_members rows get deleted/recreated on every
-- leave_space()/join_space() call (see 0014_spaces_ownership_model.sql),
-- so a flag stored there would be wiped by an ordinary "switch spaces"
-- action and incorrectly re-trigger onboarding for someone who already
-- completed it. auth.users is the only row in this schema that's
-- durable for the lifetime of the account regardless of space
-- membership churn.
--
-- This only touches raw_user_meta_data (never encrypted_password,
-- raw_app_meta_data, or any other auth.users column) — the same
-- column the client SDK's user_metadata field reads from, so no
-- admin-API round-trip is needed for a one-time bulk backfill like
-- this.
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

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"onboarding_completed": true}'::jsonb
where raw_user_meta_data->>'onboarding_completed' is null;

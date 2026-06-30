-- ============================================================
-- Enable Realtime for the expenses table
-- Run this in: Supabase Dashboard → SQL Editor → Run
--
-- Tables aren't broadcast over Realtime by default — they must be
-- explicitly added to the supabase_realtime publication. Without
-- this, postgres_changes subscriptions never fire and partners only
-- see each other's changes after a manual page reload.
-- ============================================================

alter publication supabase_realtime add table expenses;

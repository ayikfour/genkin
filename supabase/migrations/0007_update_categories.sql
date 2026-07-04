-- ============================================================
-- Replace the placeholder category list with the couple's real
-- 10-category set (Groceries, Snack, Food, Services, Coffee,
-- Commute, Cat, Lend, Health, Laundry).
-- Run this in: Supabase Dashboard → SQL Editor → Run
--
-- IMPORTANT: run manually on BOTH Supabase projects, dev first:
--   1. genkin-dev  (nvoevzkqaczhvttfdvqh) — test here first
--   2. genkin      (production, oizxibiwrmpxdleqhllw) — only after
--      verifying dev works correctly
-- There is no automated migration runner in this project; see
-- CLAUDE.md "Environments" section.
--
-- expenses.category is free text, not a foreign key (see
-- 0001_init.sql), so this is safe to run without touching existing
-- expense rows. Any pre-existing expense whose category text no
-- longer matches a row here just falls back to the app's default
-- icon/color — see src/lib/categoryColors.ts.
-- ============================================================

delete from categories;
alter table categories alter column id restart with 1;

insert into categories (name, icon) values
  ('Groceries', '🥬'),
  ('Snack',     '🥙'),
  ('Food',      '🌮'),
  ('Services',  '💆'),
  ('Coffee',    '☕'),
  ('Commute',   '🚌'),
  ('Cat',       '🐈'),
  ('Lend',      '💰'),
  ('Health',    '🩹'),
  ('Laundry',   '🧺');

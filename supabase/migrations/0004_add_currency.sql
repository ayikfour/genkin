-- ============================================================
-- Add couple-level currency setting
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- Must be run on BOTH genkin-dev and genkin (production) projects.
-- ============================================================

alter table couples
  add column currency_code text not null default 'IDR';

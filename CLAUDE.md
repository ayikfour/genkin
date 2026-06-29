# Couple's Expense Tracker

A shared expense tracker for two people to log spending into one collaborative
log and view simple summaries. Installable as a PWA. Must run on $0/month
infrastructure (free tiers only) — flag anything that risks incurring cost
before adding it.

Full product rationale and feature list: see `expense-tracker-prd.md`.
Design tokens (source of truth for all styling): see `design.md`.

## Tech stack

- Frontend: React + Vite + Tailwind CSS
- Installability: `vite-plugin-pwa`
- Charts: Recharts
- Backend: Supabase (Postgres + Auth + Realtime), free tier
- Hosting: Vercel or Netlify (frontend), Supabase (backend)

## Architecture at a glance

- Two people share one "couple" workspace. Each has their own login;
  `couple_members` links `user_id` to `couple_id`.
- All expense data lives in one `expenses` table scoped by `couple_id`.
- Row Level Security (RLS) enforces that scoping at the database level —
  every query filters to the logged-in user's `couple_id` automatically.
  Never bypass RLS with a service-role key from client-side code.
- Single currency. No multi-currency handling needed unless this changes.

## Rules

- Styling: always follow `design.md`. Don't introduce a new color, spacing
  value, or component pattern without adding it to `design.md` first —
  it's the only thing keeping screens consistent across sessions.
- Categorization is manual only for now. No AI/auto-categorization — it was
  intentionally dropped (see PRD §4 for why and how to add it back later).
- Don't add paid services or tiers without flagging it first — the $0/month
  constraint is a hard requirement, not a preference.
- Build one screen/component at a time against the Figma file rather than
  the whole app in one pass.

## Commands

_To be filled in once the project is scaffolded (dev server, build, lint, etc.)._

## Reference docs

- `expense-tracker-prd.md` — full feature list, data model, free-tier
  caveats, build order
- `design.md` — colors, type scale, spacing, component patterns (fill in
  once the Figma file is available)

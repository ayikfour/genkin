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
- Build one screen/component at a time, styled per `design.md`, rather than
  the whole app in one pass. (No Figma file is involved in this project —
  see PRD §7 for why; `design.md` is the only source of truth.)

## Commands

- `npm run dev` — start the Vite dev server (default port 5173)
- `npm run build` — type-check (`tsc -b`) and build for production into `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — run oxlint
- `npx tsc --noEmit` — type-check only, no build output

Database changes live in `supabase/migrations/*.sql` — run new migration files
manually in the Supabase Dashboard SQL Editor (no CLI/migration runner wired
up yet, since the project doesn't use the Supabase CLI for local dev). See
**Environments** below — every new migration must be run on *both* Supabase
projects, not just one.

## Environments

Two separate Supabase projects, same free tier, same org:

| | Project | Used by | `.env` |
|---|---|---|---|
| Dev | `genkin-dev` (`nvoevzkqaczhvttfdvqh`) | Local `npm run dev` | `.env` (gitignored, local) |
| Production | `genkin` (`oizxibiwrmpxdleqhllw`) | Vercel deployment | Vercel project env vars |

Local `.env` always points at `genkin-dev` — never point it at production to
avoid mixing real expense data with test data from local development. The
two databases are **not** kept in sync automatically: every new migration
file in `supabase/migrations/` must be run manually via the SQL Editor on
*both* projects (dev first to test, then production before/with the deploy
that depends on it). There's no tooling enforcing this — it's discipline only,
so double-check after writing a new migration that it actually landed on both.

## Reference docs

- `expense-tracker-prd.md` — full feature list, data model, free-tier
  caveats, build order
- `design.md` — colors, type scale, spacing, component patterns

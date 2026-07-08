# Couple's Expense Tracker

An expense tracker for logging spending and viewing simple summaries,
solo by default and shareable with one other person. Every user always
belongs to exactly one "space" — a brand-new user gets their own solo space
immediately, no setup choice required; inviting a partner turns it into a
2-person space at any time from Settings. Installable as a PWA. Must run on
$0/month infrastructure (free tiers only) — flag anything that risks
incurring cost before adding it.

Full product rationale and feature list: see `expense-tracker-prd.md`.
Design tokens (source of truth for all styling): see `design.md`.

## Tech stack

- Frontend: React + Vite + Tailwind CSS
- Installability: `vite-plugin-pwa`
- Charts: Recharts
- Backend: Supabase (Postgres + Auth + Realtime), free tier
- Hosting: Vercel or Netlify (frontend), Supabase (backend)

## Architecture at a glance

- Every user always belongs to exactly one **space** (`space_members` links
  `user_id` to `space_id`, one row per user at all times). A space with one
  member is "solo"; a space with two is a couple — there's no separate
  create/join state or creator/owner asymmetry, and (for now) a space is
  capped at 2 members.
- `expenses`, `budgets`, and `recurring_expenses` are **not** scoped by
  `space_id` — that column doesn't exist on them. Each row is owned by a
  user instead (`paid_by`, falling back to `logged_by` for legacy
  CSV-import rows with no `paid_by` yet; `user_id` directly for budgets;
  `paid_by` directly for recurring expenses). Row Level Security grants
  access to your own rows plus rows owned by anyone currently in your
  space, via the `is_space_mate()` helper — never bypass RLS with a
  service-role key from client-side code.
- This ownership model is why leaving or switching spaces
  (`leave_space()` / `join_space()` RPCs) never needs to copy or move any
  expense/budget/recurring data — a user's own rows are always theirs;
  only who else can see them changes.
- Single currency per space. No multi-currency handling needed unless this
  changes.

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

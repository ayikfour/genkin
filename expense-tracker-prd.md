# Couple's Expense Tracker — Product Definition & Tech Stack

*Last drafted: June 2026. Free-tier details for Supabase, Gemini, and Figma change often — re-check official pricing pages before you build and again before you ship.*

## 0. Status — solo-by-default spaces shipped (2026-07-08)

All core features below are built and deployed at
[usegenkin.vercel.app](https://usegenkin.vercel.app/),
running on $0/month infrastructure (Supabase free tier + Vercel free tier +
Resend free tier for auth email). See `CLAUDE.md` §Commands for local dev,
and `supabase/migrations/*.sql` for the as-built schema (the sketch in §5
below predates several fields and one full reframe added during build —
treat the migration files as canonical). Sections below are kept as the
original product brief; where reality diverged during the build, a note
marks it.

**2026-07-08 reframe:** the app moved from a forced Create/Join-a-couple
onboarding gate to a **solo-by-default space** model — every user always
belongs to exactly one space; a brand-new user gets their own solo space
immediately and can invite a partner later from Settings. "Couple" is no
longer a distinct entity — it's just a space that happens to have 2
members (spaces are still capped at 2 members for now; see §3). Settle-up
(§2.7 below, in the original brief) was fully removed earlier in the
project's life (migration `0003_remove_split.sql`) and this reframe doesn't
bring it back — see the settle-up note under §3.

## 1. Overview

An expense tracker for logging spending into a personal log and viewing
simple summaries — installable as a PWA on your phone, running on $0/month
infrastructure. Solo by default: every account gets its own log
immediately. Optionally shareable with one other person (a "space"), so two
people can log into one collaborative view instead.

**Assumption:** single currency per space. Say so if you need multi-currency — it's a small schema change, easier to add now than retrofit later.

## 2. Core Features (MVP)

1. **Solo-by-default, optionally shared log** — every user always belongs
   to exactly one space; a brand-new user lands in their own solo space
   immediately (no setup choice required) and can add/edit/delete
   expenses right away. Inviting a second person via an invite code (from
   Settings, any time) turns it into a shared space — both members then
   add/edit/delete entries and see the same list in (near) real time.
   Leaving a shared space, or switching to a different one, is always
   available from Settings too (see §3).
2. **Add expense**: amount, category (manual selection), description/merchant, date, who paid.
3. **Dashboard / summaries**:
   - Daily spend chart (line or bar, trailing 30 days)
   - Category breakdown (donut/pie)
   - Monthly total + month-over-month comparison
   - "Who paid" split (only shown once a space has 2 members)
4. **Filters**: by category and payer (date-range filtering was descoped — the date-grouped log scrolls chronologically instead; revisit if the log grows large enough to need it).
5. **Auth**: each person has their own login (magic-link / email-OTP, or a password — see `ChangeUsernameSheet`/`PasswordSheet`). No separate "create or join" step at signup; a solo space is provisioned silently the first time someone signs in (see §3).
6. **PWA**: installable on phone home screen, works like a native app.
7. **Budgets**: per-person monthly budget, month-scoped with carry-forward (a month with no explicit value inherits the most recent prior one) — tracked on the Log/Dashboard screens' progress bars.
8. **Recurring expenses**: weekly/monthly/yearly templates, materialized lazily into real expense rows by whoever opens the app next (no server-side scheduler, to stay on the $0/month tier).
9. **CSV import**: bulk-import historical expenses logged before the app existed, including expenses paid by a partner who doesn't have an account yet (a plain-text placeholder name that gets promoted to their real account once they join the space).

Settle-up ("who owes whom" balance tracking) was originally adopted into
the MVP and then fully removed — see §3.

## 3. Build-time decisions (history)

- **Settle-up was built, then removed.** Originally a "your call" stretch item, it was folded into the MVP early (before any schema was written) specifically so `paid_by`/`split` didn't need to be retrofitted later — an expense was either `even` (50/50, split into an implicit running balance) or `payer_only` (not shared), with `get_monthly_balance()` computing who owed whom. It was dropped entirely in `0003_remove_split.sql`, well before the solo-by-default reframe — the `split` column, `monthly_balance` view, and `get_monthly_balance()` RPC no longer exist, and there is no Balance screen. The "Who paid" chart on Dashboard/Log is a different, simpler thing that survived: a spending-breakdown visualization with no "you owe" math, shown only when a space currently has 2 members.
- **Solo-by-default reframe (2026-07-08):** every user always belongs to exactly one **space** (`spaces`/`space_members`, renamed from `couples`/`couple_members`) — a space with 1 member is solo, a space with 2 is what used to be called a "couple." No creator/owner asymmetry: leaving is a single symmetric action available to any member, and a space with zero members is deleted rather than kept as a dead entity. Spaces remain capped at 2 members for now — generalizing to N members is a separate, larger decision not made yet.
- **Expenses/budgets/recurring expenses are owned by a user, not scoped to a space.** Each row's owner is `paid_by` (falling back to `logged_by` for legacy CSV-import rows with no `paid_by` yet), `user_id`, and `paid_by` respectively — RLS grants visibility to your own rows plus rows owned by anyone currently in your space. This is why **leaving or switching spaces never copies or moves any data** — a user's own history is always theirs; only who else can see it changes. (An earlier design considered copying a leaver's rows into a fresh solo space, mirroring how the space itself works — the ownership model above replaced that entirely, since there was nothing left to copy.)
- **Split is binary, not itemized** (historical, from the removed settle-up feature): an expense was either `even` (50/50) or `payer_only` (not shared) — there was no partial/custom-percentage split.
- **Logging an expense does not duplicate it into two rows.** One expense = one row, `paid_by` = who physically paid, `logged_by` = who typed it in (can differ — either space member can log an expense on the other's behalf). The "Who paid" filter on the Log screen shows only what each person physically paid for.

## 4. Other stretch ideas (skip for MVP)

- Auto-categorization via a free-tier AI API (e.g. Gemini) — dropped for now per your call; straightforward to bolt on later via a Supabase Edge Function once the manual-entry flow is solid
- CSV export (distinct from CSV *import*, which is built — see §2.9)
- Generalizing spaces beyond a 2-member cap (see §3)
- Push notifications (limited on PWA — would need extra setup, may not be worth it for v1)

## 5. Data model (as built)

This sketch predates the build; the real schema lives in
`supabase/migrations/*.sql` — treat those files as canonical, especially
`0014_spaces_ownership_model.sql`, which is the source of truth for the
current shape (renamed tables, ownership-based RLS, `create_space()` /
`join_space()` / `leave_space()`).

```
spaces
  id, name, invite_code (auto-generated, unique), currency_code, created_at

space_members
  space_id, user_id, display_name, joined_at
  -- capped at 2 members; every user has exactly one row here at all times

expenses
  id
  paid_by         -- user_id who actually paid (nullable — see paid_by_label)
  paid_by_label   -- plain-text payer name for CSV-imported rows logged
                     before that person had an account
  logged_by       -- user_id who entered it (may differ from paid_by)
  amount
  category
  description
  expense_date
  recurring_expense_id  -- links a materialized occurrence back to its template
  created_at
  -- ownership/visibility: coalesce(paid_by, logged_by) — see below.
  -- No space_id column; visibility is computed, not stored.

budgets
  user_id, effective_month, monthly_amount, updated_at
  -- one row per (person, month) they changed it in; a month with no
  -- explicit row carries forward the most recent prior one
  -- (src/lib/budgetSummary.ts). Owner: user_id directly.

recurring_expenses
  id, paid_by, created_by, amount, category, description,
  frequency (weekly | monthly | yearly), start_date, next_due_date,
  active, created_at
  -- Owner: paid_by directly (not null).

categories
  id, name, icon   -- seeded: Groceries, Snack, Food, Services, Coffee,
                       Commute, Cat, Lend, Health, Laundry
                       (RLS disabled — read-only reference data, same for
                       all users, no per-space scoping needed)
```

**Ownership + visibility, not space-scoping.** `expenses`, `budgets`, and
`recurring_expenses` have no `space_id` column — each row is owned by a
user, and Row Level Security grants access to your own rows plus rows
owned by anyone currently in your space (via the `is_space_mate()` helper).
This is a deliberate departure from the original "everything scoped to
`couple_id`" design: it means leaving or switching spaces never requires
copying or moving any data, since a user's own rows were never "in" the
space to begin with.

Beyond the tables, `0014_spaces_ownership_model.sql` (building on the
original `0001_init.sql`) adds:
- `invite_code` on `spaces` — what the "join a different space" flow needs (§2.1)
- `get_my_space_id()` — a `security definer` helper that returns the caller's current `space_id`
- `is_space_mate(target_user)` — a `security definer` helper returning true for the caller's own id or anyone currently sharing their space; the single predicate all of `expenses`/`budgets`/`recurring_expenses`'s RLS policies use
- `create_space()` / `join_space()` / `leave_space()` RPCs — security-definer functions that keep the "exactly one space per user" invariant atomic. `join_space()` doubles as "switch spaces": if the caller already belongs to a space, they're detached from it (and it's deleted if that empties it) before joining the new one. `leave_space()` detaches the caller and lands them in a fresh solo space under the same display name.
- `expenses` and `recurring_expenses` are in the `supabase_realtime` publication (migrations `0002`, `0006`) — tables aren't broadcast by default; this is what makes the shared log update live between space members instead of requiring a manual refresh. Realtime respects RLS, so a client only receives change events for rows it's actually allowed to see.

## 6. Tech stack (target: $0/month)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | You already know React; Vite is fast and free |
| Installability | `vite-plugin-pwa` | Standard, free, open-source way to make a Vite app installable |
| Charts | Recharts | Free, open-source, plays well with React |
| Backend | Supabase (free tier) | Postgres DB + Auth + Realtime + Edge Functions, bundled, generous free tier |
| Auth email | Resend (free tier, custom SMTP) | Required in practice — see friction points below |
| Hosting (frontend) | Vercel (free tier) | Standard free static hosting for Vite/React apps; what was actually used |
| Version control | GitHub (free) | `github.com/ayikfour/genkin` |

This stack is $0 at your scale (2 users). The realistic friction points, in order of likelihood:
- Supabase's 7-day inactivity pause (only matters if you both stop using the app for a week)
- Supabase's 2-project cap (fine — you only need one project)
- **(Encountered during build) Supabase's built-in auth mailer is rate-limited to ~2 emails/hour** — too strict for active development, where you're testing sign-in repeatedly. Fixed by configuring Resend as custom SMTP (Authentication → SMTP Settings), which also raises Supabase's own internal email rate limit once custom SMTP is detected.
- **(Encountered during build) Resend's free `resend.dev` sender domain can only deliver to the email address the Resend account itself is registered under** — any other recipient gets a 403 "Testing domain restriction" until you verify your own domain in Resend and switch the sender address to it. Fine for solo dev/testing; verify a real domain before the second partner needs to receive their own magic links in production.
- **(Encountered during build) Customizing Supabase auth email templates** (e.g. to show the numeric OTP code instead of just a magic link) is gated behind either a Pro plan **or** having custom SMTP configured — the free built-in mailer can't have its templates edited. Configuring Resend (above) unlocks this for free.

## 7. Figma → Claude Code handoff

**Not the path actually taken for this build.** No Figma file existed for this
project — `design.md` already contained a full token set and component
library from an unrelated dark-glassmorphic marketing-landing-page project.
Rather than starting a Figma file from scratch, that existing system was
reused: original tokens (colors, type, spacing, radii, glassmorphism recipe)
kept as-is, and a new **"App Patterns"** section was appended to `design.md`
incrementally, one pattern at a time, as each mobile screen was built (list
row, bottom sheet, chart card, etc.) — never introducing a new color/spacing/
component without documenting it there first, per the project's hard rule.
That section is now the authoritative reference for anything touching the
Genkin UI; the rest of the original guidance below is kept for future
projects that do start from an actual Figma file.

**Best path: Figma's MCP (Model Context Protocol) server.** It lets Claude Code read your actual Figma file — components, colors, spacing, typography, layout — instead of you describing it in words or Claude Code guessing from a screenshot. Two versions:

- **Remote server** (Figma recommends this for most people): set up once via `claude plugin install figma@claude-plugins-official` inside Claude Code, then authenticate.
- **Desktop server**: runs through the Figma desktop app's Dev Mode toggle, for specific org/enterprise cases.

**The catch for zero-cost:** full MCP access needs a paid Figma "Dev" or "Full" seat. The free Figma plan is reported to cap remote MCP calls at roughly 6/month — enough to pull a handful of key screens once, not enough for back-and-forth iteration.

**Fully-free fallback** (works on any Figma plan):
1. Select a frame → use Figma's Inspect panel to read exact colors, spacing, and font values (no Dev Mode/MCP needed for basic inspection).
2. Export icons as SVG and images as PNG directly from Figma.
3. Take a screenshot of each screen.
4. Feed Claude Code: the screenshot + the specific token values (hex colors, font sizes, spacing) + exported assets, screen by screen.

**Either way:**
- Don't just hand tokens to Claude Code in passing — write them into a `design.md` file at the project root (template below). Point Claude Code at it explicitly ("follow design.md for all styling") at the start of every session — this is what keeps screen 5 consistent with screen 1 instead of drifting as you build over multiple sittings.
- Build one screen/component at a time, not the whole app in one prompt, and update `design.md` immediately if you spot a new pattern (e.g. a specific empty-state style) so it carries forward.
- This chat also has a Figma connector available — once you share the file link here, I can pull design context directly in our conversation too (same free-tier call caveat applies).

### `design.md` — what it should contain

A living reference, not a one-time export. Structure:
- **Colors** — named tokens with hex values (primary, background, surface, text, muted text, success/danger for things like positive/negative balance)
- **Typography** — font families and sizes for each role (headings, body, amounts/numbers, captions), since a numbers-heavy app like this often wants a distinct treatment for amounts
- **Spacing scale** — the actual values your Figma file uses (e.g. 4/8/12/16/24/32px), not a generic scale
- **Corner radius & shadows** — per component type (cards, buttons, inputs)
- **Component patterns** — button states, list item / card layout, input styling, chart colors per category
- **Notes** — anything Figma's Inspect panel or the MCP server surfaces that doesn't fit the categories above

I've put a fillable template in `design.md` alongside this doc — fill it in once you pull the Figma file (or have Claude Code populate it via the Figma MCP server), then keep it updated as you go.

## 8. Build order (as executed)

All phases below are complete and deployed (see §0).

1. ✅ Tooling guardrails — git init, `.gitignore`, npm scripts
2. ✅ Supabase project: schema + RLS policies scoped to `couple_id` (`supabase/migrations/0001_init.sql`)
3. ✅ React + Vite + Tailwind v4 scaffold, wired to `design.md`'s existing token set
4. ✅ Auth (magic-link + OTP-code fallback) + "create or join a couple" flow
5. ✅ Expense list + add/edit form, realtime sync, filters — styled per `design.md`, new patterns appended there first
6. ✅ Dashboard charts (daily spend, category breakdown, who-paid split) — same process
7. ✅ Settle-up / balance screen, reading `get_monthly_balance()` — later removed entirely (`0003_remove_split.sql`), well before the reframe below
8. ✅ PWA manifest + icons + service worker, deployed to Vercel, `CLAUDE.md` §Commands filled in
9. ✅ Budgets (`0009`, month-scoped with carry-forward in `0011`) and recurring expenses (`0006`)
10. ✅ CSV import, including placeholder-payer backfill on join (`0008`, `0010`)
11. ✅ Solo-by-default reframe (2026-07-08, `0014_spaces_ownership_model.sql`): renamed `couples`/`couple_members` to `spaces`/`space_members`, moved `expenses`/`budgets`/`recurring_expenses` to the ownership + visibility-sharing RLS model (§3/§5), removed the forced Create/Join onboarding gate in favor of silent solo-space provisioning, added the "Join a different space" and "Leave this space" flows in Settings

No further build phases are planned; future work would come from §4's stretch ideas or new feature requests.

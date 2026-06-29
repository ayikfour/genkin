# Couple's Expense Tracker — Product Definition & Tech Stack

*Last drafted: June 2026. Free-tier details for Supabase, Gemini, and Figma change often — re-check official pricing pages before you build and again before you ship.*

## 1. Overview

A shared expense tracker for two people (you + your girlfriend) to log spending into one collaborative log and view simple summaries — installable as a PWA on your phones, running on $0/month infrastructure.

**Assumption:** single currency for now. Say so if you need multi-currency — it's a small schema change, easier to add now than retrofit later.

## 2. Core Features (MVP)

1. **Shared expense log** — either partner adds/edits/deletes entries; both see the same list in (near) real time.
2. **Add expense**: amount, category (manual selection), description/merchant, date, who paid.
3. **Dashboard / summaries**:
   - Daily spend chart (line or bar, trailing 30 days)
   - Category breakdown (donut/pie)
   - Monthly total + month-over-month comparison
   - "Who paid more this month" split
4. **Filters**: by date range, category, payer.
5. **Auth**: each partner has their own login, joined into one shared "couple" workspace (via invite code or shared link).
6. **PWA**: installable on phone home screen, works like a native app.

## 3. Recommended addition (your call)

- **Settle-up / balance tracker** — "who owes whom" running balance, the way Splitwise works. Very natural fit for a couple's shared log and not much extra work given the data model below (just need a `paid_by` vs `split_between` distinction). Worth including unless you specifically don't want it.

## 4. Other stretch ideas (skip for MVP)

- Auto-categorization via a free-tier AI API (e.g. Gemini) — dropped for now per your call; straightforward to bolt on later via a Supabase Edge Function once the manual-entry flow is solid
- Recurring expense templates (rent, subscriptions)
- CSV export
- Per-category budgets with progress bars
- Push notifications (limited on PWA — would need extra setup, may not be worth it for v1)

## 5. Data model (sketch)

```
couples
  id, name, created_at

couple_members
  couple_id, user_id, display_name

expenses
  id, couple_id
  paid_by      -- user_id who actually paid
  logged_by    -- user_id who entered it (may differ from paid_by)
  amount
  category
  description
  expense_date
  created_at

categories
  id, name, icon   -- seed defaults: Groceries, Food & Drink, Transport,
                       Rent/Bills, Entertainment, Health, Shopping, Other
```

Row Level Security (RLS) in Postgres scopes every query to rows where `couple_id` matches the logged-in user's couple — this is what makes the shared log secure without a custom backend.

## 6. Tech stack (target: $0/month)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | You already know React; Vite is fast and free |
| Installability | `vite-plugin-pwa` | Standard, free, open-source way to make a Vite app installable |
| Charts | Recharts | Free, open-source, plays well with React |
| Backend | Supabase (free tier) | Postgres DB + Auth + Realtime + Edge Functions, bundled, generous free tier |
| Hosting (frontend) | Vercel or Netlify free tier | Standard free static hosting for Vite/React apps |
| Version control | GitHub (free) | Also what Claude Code will commit to |

This stack is $0 at your scale (2 users). The realistic friction points, in order of likelihood:
- Supabase's 7-day inactivity pause (only matters if you both stop using the app for a week)
- Supabase's 2-project cap (fine — you only need one project)

## 7. Figma → Claude Code handoff

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

## 8. Suggested build order

1. Supabase project: schema + RLS policies scoped to `couple_id`
2. React + Vite scaffold: auth + "create or join a couple" flow
3. Pull design tokens from Figma into `design.md` (see Section 7) — do this before styling any screen, not after
4. Expense list + add-expense form, styled per `design.md`
5. Dashboard charts, styled per `design.md`
6. PWA manifest + service worker for installability
7. Final pass: compare each screen against Figma directly, refine, update `design.md` with anything you missed

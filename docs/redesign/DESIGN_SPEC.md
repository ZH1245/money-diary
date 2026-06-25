# Money Diary — Redesign Spec (v2)

Source: Claude Design "Money Diary Redesign.dc.html". This doc is the contract for the
redesign. **Goal: change the whole look & feel; keep ALL existing functionality, data
hooks, queries, routes, and APIs intact.** Only restyle/restructure the UI.

## Themes (two palettes × two modes = 4 combos)

There are **two independent axes**:
- **Palette**: `C` (default, calm green / Manrope) or `A` (indigo / Inter Tight + IBM Plex Mono).
  Controlled by `data-theme` on `<html>`: absent or `data-theme="c"` = C, `data-theme="a"` = A.
- **Mode**: light (default) or dark. Controlled by the existing `.dark` class on `<html>`.

Both persist in localStorage (`md-theme` = `c|a`, `md-mode` = `light|dark`). Use the
`useTheme()` hook in `src/components/layout/theme-provider.tsx`. The theme control
(palette segmented C/A + light/dark switch) lives in `src/components/layout/theme-toggle.tsx`.

### Token reference (already wired into `src/styles.css`)

All four palettes are defined in `styles.css` as CSS variables mapped both to the existing
shadcn tokens (`--background`, `--foreground`, `--primary`, `--card`, `--border`, `--muted-foreground`,
`--ring`, `--sidebar*`, …) **and** to design-semantic tokens exposed as Tailwind utilities via
`@theme inline`. **Use these utilities — do not hardcode hex.**

| Purpose | Tailwind utility | CSS var |
|---|---|---|
| App canvas bg | `bg-canvas` | `--canvas` |
| Panel / card bg | `bg-panel` | `--panel` |
| Foreground text | `text-foreground` | `--fg` |
| Muted text | `text-muted-foreground` | `--muted` |
| Accent (brand) bg/text | `bg-primary` / `text-primary` | `--accent` |
| On-accent text | `text-primary-foreground` | `--accent-on` |
| Soft accent (chips, active nav) | `bg-soft-accent` | `--soft-accent` |
| Income (positive) | `text-income` | `--income` |
| Expense (negative) | `text-expense` | `--expense` |
| Progress track | `bg-track` | `--track` |
| Row hover | `hover:bg-row-hover` | `--row-hover` |
| Input bg | `bg-input-bg` | `--input-bg` |
| Border | `border-border` | `--border` |
| Faint border | `border-border-faint` | `--border-faint` |
| Avatar bg/fg | `bg-avatar` / `text-avatar-fg` | `--avatar-bg` / `--avatar-fg` |
| Nav active fg | `text-nav-active-fg` | `--nav-active-fg` |
| Numeric font | `font-num` | `--font-num` |
| Panel radius | `rounded-panel` | `--radius-panel` |

Helper component classes in `styles.css`: `.md-panel` (panel surface), `.md-row`
(hoverable list row), `.md-chip`, `.md-stat`. Numbers/amounts use `font-num` +
`tabular-nums` + `font-extrabold tracking-tight`.

### Exact palette values (for reference; already in styles.css)

**C light**: canvas #F4F3EF, sidebar/panel #FCFCFA, fg #15201a, muted #9aa09a, border #E7E7E1,
border-faint #EEEEE8, accent #1f6b4a, accent-on #f0f4f1, soft-accent #E3EDE6, income #1f6b4a,
expense #b0473d, nav-active #E3EDE6, nav-active-fg #1f6b4a, track #E9E9E3, row-hover #F4F4EF,
input-bg #F4F4EF, avatar-bg #1f6b4a, avatar-fg #f0f4f1, shell-bg #E4E3DE.
**C dark**: canvas #141714, sidebar/panel #1A1E1A, fg #EAF0EA, muted #7d847d, border #2A2F2A,
border-faint #23271F, accent #3a9b6f, accent-on #0c130f, soft-accent #23311F, income #4fc18c,
expense #e07a6f, nav-active #23311F, nav-active-fg #4fc18c, track #2A2F2A, row-hover #21261F,
input-bg #21261F, avatar-bg #3a9b6f, avatar-fg #0c130f, shell-bg #0a0c0a.
**A light**: canvas #F5F5F7, sidebar/panel #ffffff, fg #16161c, muted #9a9aa4, border #ECECEF,
border-faint #F2F2F5, accent #4f46e5, accent-on #ffffff, soft-accent #ECEBFC, income #1f9d5b,
expense #d4493f, nav-active #ECEBFC, nav-active-fg #4f46e5, track #EEEEF1, row-hover #FAFAFB,
input-bg #F5F5F7, avatar-bg #4f46e5, avatar-fg #ffffff, shell-bg #E4E4E8.
**A dark**: canvas #0E0E12, sidebar/panel #16161C, fg #F2F2F5, muted #7a7a85, border #26262E,
border-faint #1E1E25, accent #6c63ff, accent-on #ffffff, soft-accent #23223A, income #34d680,
expense #f06a5d, nav-active #23223A, nav-active-fg #9b94ff, track #26262E, row-hover #1C1C23,
input-bg #1C1C23, avatar-bg #6c63ff, avatar-fg #ffffff, shell-bg #070709.

Fonts: C uses Manrope (ui + numbers). A uses Inter Tight (ui) + IBM Plex Mono (numbers).
All three are loaded in styles.css; `--font-sans` and `--font-num` switch automatically by palette.

## App shell (owned in `authenticated-app-shell.tsx`)

**Desktop**: left sidebar (collapsible 214px↔70px). Sections: **Overview** (Dashboard,
Transactions, Analytics), **Planning** (Goals, Savings, Wishlist), **System** (Settings) plus
the existing Admin items when `user.role==='admin'`. Sidebar footer: palette/mode toggle + user
block (avatar, name, email, sign-out). Top header: page title + subtitle, search box, "Ask AI"
button (opens AI panel), notifications bell, primary "Add" button.

Active nav item: `bg-soft-accent text-nav-active-fg font-bold`. Idle: `text-muted-foreground`.

**Mobile (native-app feel)**: NO desktop sidebar. Instead:
- Top bar: hamburger (opens slide-in nav sheet from left), centered page title, Ask-AI icon + avatar.
- **Bottom tab bar** fixed to bottom with 5 slots: Home, Txns, **center floating FAB (+, raised, accent)**, Goals, More(Settings). Active tab text = accent. The FAB opens the Add-transaction flow.
- Hamburger sheet: brand, full nav list, footer with palette/mode toggle + sign-out.
- Use a `useIsMobile()`/media-query hook (Tailwind `lg:` breakpoint). The phone-frame border from
  the design is only a preview artifact — real app is full-bleed responsive.

## Page specs (restyle existing pages; keep data)

Numbers shown in the design are placeholders — wire each section to the **existing** query hooks.
Use panels (`.md-panel` / `bg-panel rounded-panel border border-border`), generous padding (~22px),
soft shadow.

- **Dashboard** (`features/dashboard`): (1) Account cards row — selectable gradient cards, tap to
  filter (use payment accounts). (2) Big balance + change% + mini-stats (Income / Spent / Txns) +
  12-bar mini bar chart. (3) Two-up: **Monthly budget** progress + **Upcoming bills** list. (4) Two-up:
  **Recent activity** list (links to Transactions) + **Spending by category** bars.
  ⚠️ NEW (no API yet): "Monthly budget" and "Upcoming bills" — stub with typed mock + `// TODO(api)`.
- **Transactions** (`features/transactions`): 3 summary tiles (Total in / out / net) + filter pills
  (All / Income / Spending / Subscriptions) + transaction table (icon, name, date, category tag,
  account, amount). Row click → edit drawer. Keep existing table/data hooks.
- **Analytics** (`features/analytics`): 3 KPI tiles (Net worth, Avg monthly spend, Savings rate) +
  Income-vs-spending grouped bars (6 mo) + Top merchants list + "Where it goes" donut + legend.
  ⚠️ NEW (no API yet): Net worth, Savings rate, Top merchants — stub + `// TODO(api)`.
- **Goals** (`features/goals`): 2-col grid of goal cards (emoji, name, target date, saved/target,
  progress bar, %, remaining). Keep goals query/mutations.
- **Savings** (`features/savings`): gradient hero (total saved + this-month delta) + grid of pot
  cards (emoji, name, amount, progress). Keep savings query.
- **Wishlist** (`features/wishlist`): header (count + total) + Add button + 3-col card grid (emoji
  banner, priority badge, name, saved/price, progress, %). Keep wishlist query/mutations.
- **Settings** (`features/settings`): profile card, security rows, notifications toggles,
  About & Legal links (Privacy/Terms), danger zone (delete account). Keep existing settings logic.
- **Categories / Accounts / Admin / Swagger**: not in the mockup — restyle to match the new panel/
  token system consistently (panels, chips, tokens, fonts). Keep all logic.
- **Auth** (`sign-in`, `sign-up`, `forgot-password`, `setup-security`): split layout — left brand
  panel with gradient (`--accent` → darker), right form card. Keep better-auth logic & fields.
- **Legal** (`privacy`, `terms`): centered article panel with sectioned headings.

## Overlays

- **AI transaction panel** (`components/ai/ai-transaction-panel.tsx`): slide-in from right (desktop)
  / bottom sheet (mobile). Header (icon + "AI Assistant" + online dot), message bubbles (me =
  accent bubble right, ai = soft-accent bubble left), suggestion chips, input + send. Keep existing
  AI logic/endpoints.
- **Add/Edit transaction drawer** (`components/forms`): right drawer (desktop) / bottom sheet
  (mobile). Expense/Income tabs, big amount input, description, category chips, account chips,
  date+time, note, save/cancel; delete in edit mode. Keep existing form logic & mutations.
- **Confirm modal**: centered card for destructive confirms (delete tx, delete account).

## Rules for all agents

1. **Do not change behavior, data fetching, routing, or API calls.** Restyle only. If a section has
   no backing API (flagged ⚠️ above), stub with a typed constant + `// TODO(api): ...` and keep it
   visually complete.
2. Use the design tokens / Tailwind utilities above. No hardcoded hex except gradient stops that
   match the spec.
3. Reuse shadcn primitives in `src/components/ui/*` (they auto-reskin from the tokens).
4. Keep accessibility: buttons are `<button>`, inputs have labels, icons have aria-labels.
5. Match the existing code style (biome, `#/` import alias, named exports, Poppins→new fonts).
6. After your change, the page must typecheck and build. Run `pnpm check` on files you touch.

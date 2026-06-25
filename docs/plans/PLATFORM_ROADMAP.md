# Money Diary — Platform Roadmap & Plans

> Status: planning document. Only the **Priority fixes** section is implemented.
> Everything else is a plan to be scheduled/sequenced, not yet built.
> Stack reference: TanStack Start (React 19) on **Vercel**, Neon Postgres + Drizzle,
> better-auth (cookie sessions via `tanstackStartCookies`), REST API under
> `src/routes/api/*` with an OpenAPI doc at `src/routes/api/openapi.json.ts`.

---

## 0. Priority fixes — DONE (this branch)

1. **Mobile dashboard mini-stat overflow** — Income/Spent now use compact currency
   (`formatSensitiveCompactAmount`, e.g. `PKR 188.7K`); `InsightMiniCard` font is
   responsive (`text-base sm:text-lg`, `break-words`). No more 3-line wraps / truncated labels.
2. **Mobile FAB now opens the create modal in place** instead of navigating.
   - New store `src/features/transactions/store/quick-add-transaction-store.ts`.
   - Extracted `src/features/transactions/components/transaction-form-sheet.tsx`
     (self-contained create/edit sheet, controlled by `open`).
   - Mounted once in `authenticated-app-shell.tsx`; FAB + the Transactions page
     "Create" button both call `openQuickAddTransaction()`. Works on every page.

This extraction is also the **first concrete step of the code-breakdown** below.

---

## 1. Code breakdown plan (refactor — plan only)

**Finding:** the architecture is already good. Feature folders follow a clean
convention: `api/` (client fetchers) · `schemas/` (zod DTOs) · `server/` (repository) ·
`hooks/` (react-query) · `store/` · `types/` · `utils/` · `components/`. Shared server
helpers live in `src/lib/server/*` (`api-guards`, `request-body`, `ownership-guards`…).

The "mess" is concentrated in a few **oversized presentational components** created
during the redesign, not in the data layer. So the breakdown is *decomposition +
consistency*, not a re-architecture.

### 1a. Decompose large page-content components
Target: no component file > ~250 lines; one responsibility each.

| File | Split into |
|---|---|
| `dashboard-page-content.tsx` (~640) | `BalanceOverviewCard`, `MiniTrendChart`, `BudgetCard`, `UpcomingBillsCard`, `RecentActivityCard`, `SpendingByCategoryCard` (already has `AccountCardsRow`, `InsightMiniCard`) |
| `transactions-page-content.tsx` | ✅ `TransactionFormSheet` extracted; next: `TransactionFlowCharts`, `TransactionSummaryTiles`, `TransactionTable` column defs → `transaction-columns.tsx` |
| `analytics-page-content.tsx` | per-section cards (`NetWorthCard`, `SavingsRateCard`, `TopMerchantsCard`, chart blocks) |

Pattern: keep the page-content file as a thin orchestrator (queries + layout); push
JSX blocks into `components/`, push calculations into `utils/` (already done for
`dashboard-stats.ts`, `transaction-display.ts`).

### 1b. Shared libs / helpers to consolidate
- **UI primitives:** the design helper classes (`md-panel`, `md-stat`, `md-chip`) +
  repeated card scaffolds → a small `components/ui/stat-card.tsx`, `section-card.tsx`
  so cards stop being copy-pasted divs.
- **Money formatting:** `src/lib/privacy/sensitive-format.ts` + `features/shared/utils/amount.ts`
  are the canonical money helpers — audit pages to ensure none re-implement currency formatting inline
  (the create form's local `getCurrencySymbol` is a candidate to hoist into `lib/currency.ts`).
- **DTO/validation:** zod schemas already live per-feature in `schemas/`. Establish the
  rule "request/response DTOs are zod schemas in `schemas/`, inferred types in `types/`"
  and backfill any route doing ad-hoc validation.

### 1c. Sequencing
Do this **after** the new features are scoped, so we split components along the seams the
new sections need (e.g. don't decompose the dashboard twice). One PR per page, mechanical,
build-gated. Low risk, no behavior change.

---

## 2. New backend APIs (plan only)

> **APIs the redesign introduced (currently stubbed in the UI, no endpoint yet)** — these are
> the immediate gaps to close: **Budgets** (`MONTHLY_BUDGET_STUB`), **Upcoming bills**
> (`UPCOMING_BILLS_STUB`) in `src/features/dashboard/types/planning-stub.ts`; and Analytics
> **Net worth / Savings rate / Top merchants**. Everything below the line is forward-looking.

All follow the existing route pattern: `guardApiRequest` → `requireUserContext` →
`parseJsonBody` → zod `safeParse` → repository call → `Response.json({ success, data })`.
Each needs: Drizzle table/migration, `schemas/`, `server/<x>-repository.ts`, `api/` fetcher,
`hooks/`, and an OpenAPI entry.

| Domain | Endpoints | Notes |
|---|---|---|
| **Budgets** (replaces dashboard `MONTHLY_BUDGET_STUB`) | `GET/POST /api/budgets`, `PATCH/DELETE /api/budgets/$id` | per-category or overall monthly limit; "spent" computed from transactions in-range |
| **Bills / recurring** (replaces `UPCOMING_BILLS_STUB`) | `GET/POST /api/recurring`, `$id` | see §6 — this is the recurring-subscription engine; "upcoming bills" is a view over it |
| **Analytics derived** | `GET /api/analytics/net-worth`, `/savings-rate`, `/top-merchants` | compute server-side from existing tables; cache per user+range; removes analytics stubs |
| **Notifications** | `GET /api/notifications` (inbox), `POST /api/notifications/read`, admin `POST /api/admin/notifications` | see §5 |
| **Devices / push** | `POST /api/devices` (register token/subscription), `DELETE /api/devices/$id` | web push subscription + Expo push token |
| **Entitlements / plan** | `GET /api/me/entitlements` | gates premium (SMS import, etc.); add `plan` to user or a `subscriptions_billing` table |
| **SMS ingest** | `POST /api/ingest/sms` | accepts a parsed candidate transaction from the mobile app (§4) |

---

## 3. React Native app — port plan & shared auth (plan only)

**Feasibility of shared sessions: yes.** better-auth is the same server; the only blocker
is that RN can't use httpOnly cookies the way the web does.

### Auth approach
- Add the **`bearer` plugin** + **`@better-auth/expo`** to `src/lib/auth.ts` (keep
  `tanstackStartCookies` for web). RN gets a session **token** it stores in
  **Expo SecureStore** and sends as `Authorization: Bearer <token>`.
- Configure `trustedOrigins` to include the app scheme (`moneydiary://`) and enable
  **CORS** for the API so the native client can call `src/routes/api/*` directly.
- Same Neon DB, same `user`/`session` tables → a user logs into web and mobile with one account.

### Client architecture (maximize reuse)
- **Expo (React Native) + Expo Router** — mirrors TanStack Router's file-based routing
  mentally; ships push + SecureStore + native modules.
- **Reuse the non-DOM layer wholesale:** zod `schemas/`, `types/`, `utils/`
  (`transaction-display`, `dashboard-stats`, money/date helpers), `api/` fetchers, and the
  react-query `hooks/` are all platform-agnostic. Extract these into a shared workspace
  package (`packages/core`) in a pnpm monorepo so web + mobile import the same code.
- **Rebuild only the view layer** (RN components instead of Tailwind/DOM). The redesign's
  "mobile app shell" was deliberately app-like, so the IA (bottom tabs + FAB + sheets) maps
  1:1 to native.
- Charts: swap `recharts` → `victory-native`/`react-native-svg`.

### Suggested repo shape
```
packages/core      ← schemas, types, utils, api clients, query hooks (shared)
apps/web           ← current TanStack Start app
apps/mobile        ← Expo app
```
This monorepo move is the larger lift; the auth bearer-plugin change is small and can land first.

---

## 4. Premium: auto-transactions from bank SMS / notifications (plan only)

**Platform reality:** **Android only.** iOS does not allow reading SMS or other apps'
notifications. Market this as an Android premium perk; iOS users keep manual + AI entry.

### How it works
1. **Capture (native, on-device):**
   - SMS: `READ_SMS` permission, or the safer **`NotificationListenerService`** to read
     *bank app notifications* (covers banks that only push app notifications, not SMS).
   - Implement as an Expo **config plugin / native module** (foreground/​background task).
2. **Parse on-device:** per-bank regex/templates → `{ amount, currency, merchant, type,
   account-last4, timestamp }`. Keep raw message **on device**; never send the SMS body to
   the server (privacy). Maintain a versioned template pack (update OTA).
3. **Confirm → create:** push a *pending transaction* into a review queue. High-confidence
   matches can auto-create; others wait for one-tap confirm. On confirm →
   `POST /api/ingest/sms` (or the normal `POST /api/transactions`) with the structured fields
   + a dedupe key (hash of bank+amount+timestamp) to avoid double entries.
4. **Premium gate:** entitlement check (§2 Entitlements). Feature flag in settings.

### Risks / decisions
- Bank template drift → keep parsers data-driven + remotely updatable; let users correct a
  parse and learn from it.
- Permissions are sensitive → clear consent screen, on-device processing, Play Store policy
  review (SMS permission requires justification).
- Reuse the existing **AI transaction** endpoint (`/api/ai/transaction`) as a fallback parser
  for messages the regex pack can't handle.

---

## 5. Admin-triggered notification system (both platforms, historical + live) (plan only)

### Transport
- **Web:** Web Push (VAPID). The PWA already ships a service worker (`public/sw.js`) — add a
  `push` event handler + subscription registration.
- **Mobile:** **Expo Push** (wraps FCM/APNs).
- Store both in a **`devices`** table (`userId`, `platform`, `token|subscription`, `lastSeen`).

### Data model
- **`notifications`** (history + in-app inbox): `id`, `audience` (all / role / userIds),
  `title`, `body`, `data`, `createdAt`, `sentAt`, `createdByAdminId`.
- **`notification_receipts`**: `notificationId`, `userId`, `readAt` — drives unread badges and
  lets "historical" notifications appear in an in-app inbox even if the push was missed.

### "Historical or live"
- **Live:** admin composes → dispatch worker fans out push to all matching devices *now*.
- **Historical:** the same row is always written to `notifications` + receipts, so it shows in
  the in-app **inbox** on next open (and can be backfilled for users who installed later).
  Admin can choose "push now" vs "inbox only".

### Pieces
- Admin compose UI under `/admin` (audience picker, title/body, push-now toggle).
- `POST /api/admin/notifications` → writes row + enqueues dispatch.
- **Dispatch worker** (see §6 infra): batches device tokens, calls Expo Push + Web Push,
  records receipts, retries failures, prunes dead tokens.
- User side: `GET /api/notifications` inbox + unread badge in the app shell top bar.

---

## 6. Recurring subscriptions + cron strategy (the "serverless won't help" question)

**Problem:** Vercel functions are request-scoped/serverless — there's no always-on process
to "run a job at 3am". You need a **scheduler that pings an endpoint**, plus an **idempotent
endpoint** that does the work.

### Recommended pattern (works on Vercel today)
1. **Model recurrence as data, not timers.** A `recurring_rules` table:
   `userId`, `template` (amount/category/account/title), `cadence` (RRULE or
   interval+unit), `nextRunAt`, `endsAt`, `isActive`. "Upcoming bills" = a query over
   `nextRunAt` in the near future.
2. **One idempotent worker endpoint**, e.g. `POST /api/cron/run-recurring`:
   - finds rules where `nextRunAt <= now()`,
   - creates the transaction(s) (with a dedupe key = `ruleId + period`),
   - advances `nextRunAt` to the next occurrence.
   Idempotent so a double-fire never double-charges.
3. **Scheduler — pick by needs:**

| Option | Use when | Trade-off |
|---|---|---|
| **Vercel Cron Jobs** (native) | v1, simple daily/hourly tick | Easiest; coarse granularity, limited job count on lower tiers. One cron that scans `nextRunAt` is enough — you don't need a job per subscription. |
| **Upstash QStash / Inngest** | you need per-item scheduling, retries, fan-out, backoff | Durable, great for **notification dispatch** and per-subscription reminders; small external dependency. Recommended once volume grows. |
| **Neon `pg_cron` / scheduled queries** | pure DB-side jobs | DB-coupled; availability depends on Neon plan; harder to run app logic. |
| GitHub Actions cron | quick hack / low stakes | Not for production money logic. |

**Recommendation:** start with **Vercel Cron → idempotent scan endpoint** (covers recurring
transactions *and* scheduled-notification dispatch with one tick). Graduate the
**notification fan-out** and any per-subscription reminders to **Inngest or QStash** when you
need retries and durable per-message scheduling. The data-driven `nextRunAt` design means the
scheduler choice is swappable without touching the business logic.

### Security
- Protect `/api/cron/*` with a shared secret header (`CRON_SECRET`) checked in the handler;
  Vercel Cron and QStash both support sending it.

---

## Suggested execution order
1. ✅ Priority mobile + FAB fixes (done) → test on branch deploy.
2. RN **auth bearer plugin** (small, unblocks mobile) + decide monorepo move.
3. **Recurring engine** (`recurring_rules` + cron scan) → powers real "Upcoming bills".
4. **Budgets** + **analytics derived APIs** → removes remaining dashboard/analytics stubs.
5. **Notification system** (devices + inbox + admin compose + dispatch).
6. **Code breakdown** PRs (per page) once feature seams are known.
7. **Android SMS premium** (native, gated by entitlements) — largest/most policy-sensitive, last.

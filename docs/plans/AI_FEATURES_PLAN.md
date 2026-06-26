# AI Features Plan — Insight Cards & AI Advisor

> Status: **proposal for review** — not yet scheduled for implementation.
> Owner decision pending. Both features are intended as **paid-tier** capabilities
> and tie into the planned subscription/entitlements system (see
> [PLATFORM_ROADMAP.md](./PLATFORM_ROADMAP.md)).

## Recommended sequencing

1. **Phase 1 — AI Insight Cards** (low risk, reuses existing data + cron). Ship first.
2. **Phase 2 — AI Advisor** (stocks/investments + in-app logging). Bigger; depends on
   a market-data provider decision and a legal/disclaimer posture.

Rationale: Insight Cards need only data we already store, are immediately demoable,
and the per-user cost can be kept low with Haiku. The Advisor adds external data
dependencies, recurring data costs, and regulatory considerations — better to validate
the paid AI value-prop with Insights first.

---

## Phase 1 — AI Insight Cards

### What it is
A short, AI-generated narrative card surfaced below the dashboard cards and/or in
Analytics: "Here's what's going on with your money." e.g. "Your dining spend is up 32%
vs last month, mostly from 4 weekend orders. Subscriptions are steady at $48/mo."

### Why it's low risk
- Uses data we already have (transactions, categories, savings, recurring rules).
- No external data provider.
- Output is descriptive, not advice — minimal liability.

### Design
- **Input = aggregates, not raw rows.** Compute server-side stats (per-category totals,
  month-over-month deltas, top merchants, savings rate, upcoming recurring totals) and
  send a compact JSON summary to the model. Never ship the full ledger to the LLM —
  cheaper, faster, and better for privacy.
- **Model:** Claude **Haiku 4.5** (`claude-haiku-4-5-20251001`) — cheap enough to run
  per user on a schedule. Reserve Sonnet/Opus for the Advisor.
- **Generation cadence — do NOT regenerate per page load** (slow + expensive). Options:
  1. **Daily via existing Vercel cron** (`/api/cron/run-recurring` sibling) — generate
     once/day for active paid users, store the result. *Preferred.*
  2. **On-demand "Refresh insights" button** with a rate limit (e.g. 1/hour).
  - Likely both: daily auto-generate + manual refresh capped by entitlements.
- **Caching/storage:** new table.
  ```
  ai_insights:
    id, user_id, scope ('dashboard' | 'analytics'),
    period (e.g. '2026-06'), summary_input_hash,
    content (markdown), model, generated_at
  ```
  `summary_input_hash` lets us skip regeneration when the underlying aggregates haven't
  changed.
- **Gating:** entitlement flag `ai_insights: true`; refresh count drawn from the same
  `usage_counters` as AI chat messages.
- **Privacy:** respects the app's privacy/masking mode in the UI; the model still needs
  real numbers to reason, so generation runs server-side only and stored content should
  be treated as sensitive.

### Build order
1. Aggregation service (pure, testable) producing the summary JSON.
2. `ai_insights` table + migration (hand-managed, see drizzle convention).
3. Generation function (Haiku call) + cron entry + on-demand endpoint with rate limit.
4. UI insight card (dashboard + analytics) with loading/empty/refresh states.
5. Entitlement gating + usage counting.

### Open questions
- Daily-only, on-demand-only, or both? (recommend both)
- One combined insight or separate dashboard vs analytics insights?
- How many refreshes/day on each paid tier?

---

## Phase 2 — AI Advisor

### What it is
A conversational advisor that can discuss markets/stocks, suggest investment ideas, and
**log investments/transactions into the app** on the user's behalf.

### Biggest risk: liability, not engineering
- "Guide you for investments" can constitute **regulated financial advice** in many
  jurisdictions. Mitigations:
  - Frame everything as **educational / informational**, not personalized advice.
  - Persistent **"Not financial advice"** disclaimer + first-use acknowledgement.
  - Avoid imperative recommendations ("buy X"); prefer explanation + scenarios.
- Get this posture decided **before** building.

### Data dependency
- Needs a **market-data provider** (stock quotes/fundamentals). Real-time is costly;
  **start with delayed / end-of-day data** to control cost — fits the paid tier.
- Provider choice is a prerequisite decision (cost, coverage, ToS on redistribution).

### The strong, low-risk part: in-app logging via tool-calling
- Give the advisor **tools** to create entries — reuse the existing AI transaction
  panel infrastructure (`src/components/ai/ai-transaction-panel.tsx`) and tool-calling
  pattern.
- Add an **investments/holdings** feature so the advisor has structured data to read and
  write:
  ```
  holdings:
    id, user_id, symbol, quantity, avg_cost, currency,
    account_id?, opened_at, note, created_at, updated_at
  ```
- This part delivers value even without live market commentary (portfolio tracking +
  natural-language logging).

### Model
- **Sonnet 4.x** for normal advisor reasoning; **Opus 4.x** for deeper analysis on
  higher tiers. Tool-calling for logging actions.

### Build order (once data provider + disclaimer decided)
1. `holdings` feature (schema, API, repository, UI) — useful standalone.
2. Market-data integration behind a server adapter (swappable provider).
3. Advisor tools (read holdings, read spend summary, create holding/transaction).
4. Advisor chat surface (extend existing AI panel) with disclaimers + gating.
5. Entitlements: advisor access + message limits per tier.

### Open questions
- Which market-data provider, and real-time vs delayed?
- Disclaimer/acknowledgement flow and jurisdictions to support.
- Should the advisor be allowed to auto-execute logging, or only propose (user confirms)?
  (recommend propose-then-confirm initially)

---

## Cross-cutting

- **Cost control:** aggregates-not-rows, caching, Haiku for bulk work, message/refresh
  caps enforced by `usage_counters`.
- **Tier mapping:** Insights on lower paid tier; Advisor on higher tier; both off for
  free/ads tier (see entitlements design in PLATFORM_ROADMAP.md).
- **Default to latest Claude models** for any new AI work.

# Analytics module

> Read before editing `src/features/analytics/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Transaction-based metrics and charts: spending/income by category, monthly review, wealth
summary. Read-only over other modules' data.

## File tree

```text
analytics/
  components/analytics-page-content.tsx
  components/analytics-wealth-section.tsx
  components/category-expense-groups.tsx
  components/insight-table.tsx
  components/monthly-review-section.tsx
  components/monthly-review-savings-dialog.tsx
  utils/analytics-stats.ts             # aggregations over transactions
  utils/monthly-review.ts
  utils/wealth-summary.ts
```

## Routes

- Page: `/analytics` (no own API — consumes transactions/savings/accounts queries).

## Rules & gotchas

- **Transaction-based**: savings withdrawals do NOT appear here unless a matching expense
  was logged. This is intentional (see domain doc). Don't "fix" by pulling savings in.
- No DB table of its own — pure derivation. Keep aggregation logic in `utils/`, pure.
- Wealth section combines account balances + net savings.

## Cross-module deps

- Reads **transactions** (primary), **savings**, **payment-accounts**, **categories**.

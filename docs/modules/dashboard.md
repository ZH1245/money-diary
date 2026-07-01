# Dashboard module

> Read before editing `src/features/dashboard/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Home snapshot: account cards, wealth row, net saved, insight mini-cards, upcoming items,
recent activity — scoped by a selectable date range.

## File tree

```text
dashboard/
  components/dashboard-page-content.tsx
  components/account-cards-row.tsx
  components/dashboard-wealth-row.tsx
  components/insight-mini-card.tsx
  components/upcoming-section.tsx
  store/dashboard-date-range-store.ts  # selected range (client state)
  types/dashboard-stats.ts
  utils/dashboard-stats.ts             # net saved etc. for the range
  utils/dashboard-wealth-stats.ts
  utils/dashboard-date-range.ts
  utils/transaction-calendar-activity.ts
  utils/upcoming-items.ts              # from recurring rules
```

## Routes

- Page: `/dashboard`

## Rules & gotchas

- **`totalSaved`** = net savings (deposits − withdrawals) within the selected range
  (`dashboard-stats.ts`). Keep in sync with savings ledger math.
- Date range is client store state — recompute derived stats when it changes.
- Upcoming section derives from **recurring** rules' `nextRunAt`.

## Cross-module deps

- Reads **transactions, savings, payment-accounts, goals, recurring**.

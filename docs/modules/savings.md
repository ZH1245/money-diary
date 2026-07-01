# Savings module

> Read before editing `src/features/savings/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Ledger for money moved **into** or **out of** savings pools. Not a substitute for
transactions — savings tracks pool movement, transactions track spending.

## File tree

```text
savings/
  api/savings-api.ts
  schemas/saving.ts
  server/savings-repository.ts
  hooks/use-savings.ts
  components/savings-page-content.tsx
  components/savings-analytics-section.tsx
  components/goal-select.tsx            # link a saving to a goal
  types/saving.ts
  types/savings-stats.ts
  utils/saving-ledger.ts               # SIGNED ledger math (source of truth)
  utils/saving-form.ts
  utils/savings-stats.ts               # page totals
  utils/savings-analytics.ts
```

## Data model — `savings` table

`id · userId · goalId(→ set null) · paymentAccountId(→ set null) · title · amount(text, always positive) ·
entryType(deposit|withdrawal, def deposit) · note · savedAt · createdAt · updatedAt`

- `amount` is **always positive**; sign comes from `entryType`.
- **Net saved = deposits − withdrawals** (`getSavingLedgerDelta` in `saving-ledger.ts`).

## Routes

- Page: `/savings`
- API: `/api/savings`, `/api/savings/$id`

## Rules & gotchas

- **Deposit** = money into savings → linked payment account balance **decreases**.
  **Withdrawal** = money out of savings → linked account balance **increases**.
  (This is the account-balance direction; net-saved direction is the opposite sign.)
- "Spent from savings": log a `withdrawal` **and** usually a matching `expense`
  transaction, so analytics/spending charts stay accurate.
- Goal progress uses **net** linked savings + the goal's declared amounts.
- Ledger math is centralized — do not re-derive signs inline; call `saving-ledger.ts`.

## Cross-module deps

- **goals**: `goalId` linkage; goal progress reads net savings (`goals/utils/goal-progress.ts`).
- **payment-accounts**: signed savings deltas affect account balances
  (`payment-accounts/utils/payment-account-balance.ts`).
- **dashboard**: net saved for the date range (`dashboard/utils/dashboard-stats.ts`).
- **transactions**: withdrawals usually paired with an expense.

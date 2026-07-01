# Recurring module

> Read before editing `src/features/recurring/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Recurring transaction rules — templates that generate transactions on a schedule
(e.g. monthly subscriptions, salary).

## File tree

```text
recurring/
  api/recurring-api.ts
  schemas/recurring.ts
  server/recurring-repository.ts
  hooks/use-recurring.ts
  types/recurring.ts
  utils/recurring-schedule.ts          # next-run computation per cadence
```

## Data model — `recurring_rules` table

Template fields: `title · amount(text) · currency(def USD) · type · categoryId ·
paymentAccountId(→ set null) · source · note`
Link: `sourceTransactionId(→ cascade)` — deleting the origin transaction purges the rule.
Schedule: `cadence(def monthly) · nextRunAt · lastRunAt? · isActive(def true)`
Plus `id · userId · createdAt · updatedAt`.

## Routes

- API: `/api/recurring`, `/api/recurring/$id`
- Cron trigger: `/api/cron/run-recurring` (generates due transactions, advances `nextRunAt`).

## Rules & gotchas

- The **cron route** is the execution path — it materializes due rules into transactions
  and bumps `nextRunAt` via `recurring-schedule.ts`. Keep it idempotent per run window.
- Deleting the `sourceTransactionId` transaction **cascades** — the rule is removed.
- Amounts stored in ledger currency (see `currency` field default).

## Cross-module deps

- **transactions**: rules generate transaction rows; source transaction owns the rule.
- **payment-accounts** / **categories**: template references.

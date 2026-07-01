# Shared module

> Read before editing `src/features/shared/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

Cross-feature pure utilities that don't belong to a single feature. Keep this small —
prefer feature-local utils unless genuinely shared by 2+ features.

## File tree

```text
shared/
  utils/amount.ts                      # decimal-as-string amount helpers
```

## Rules & gotchas

- Amounts are stored as `text` (decimal strings) across ledger tables. Use `amount.ts`
  for parsing/formatting/math — do not scatter `parseFloat` in features.
- Additive only: something goes here after a 2nd feature needs it, not preemptively (YAGNI).

## Cross-module deps

- Used by **transactions, savings, goals, wishlist, payment-accounts** for amount math.
- Broader shared UI/libs live outside features: `src/components/`, `src/lib/`.

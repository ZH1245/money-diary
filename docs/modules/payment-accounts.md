# Payment accounts module

> Read before editing `src/features/payment-accounts/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Cards, wallets, cash, and bank accounts the user pays from / saves from. Provides account
selection and computed balances.

## File tree

```text
payment-accounts/
  api/payment-accounts-api.ts
  schemas/payment-account.ts
  server/payment-accounts-repository.ts
  hooks/use-payment-accounts.ts
  constants/institutions.ts             # known banks/wallets
  constants/institution-theme.ts        # per-institution colors/logos
  components/payment-accounts-page-content.tsx
  components/payment-account-select.tsx
  types/payment-account.ts
  utils/payment-account-balance.ts      # BALANCE math (transactions + signed savings)
  utils/account-form.ts
  utils/account-label.ts
  utils/protected-account.ts            # accounts that can't be deleted
  utils/resolve-payment-account-institution.ts
```

## Data model — `payment_accounts` table

`id · userId · name · institutionSlug? · accountType(debit|credit|paypak|wallet|cash|other) ·
lastFour? · note? · isActive(def true) · createdAt · updatedAt`

## Routes

- Page: `/accounts`
- API: `/api/payment-accounts`, `/api/payment-accounts/$id`

## Rules & gotchas

- **Balance** = transaction deltas + signed savings deltas on the account. Cash-on-hand
  includes both. Compute via `payment-account-balance.ts` only.
- Deleting an account sets `paymentAccountId` to null on transactions/savings/recurring
  (FK `set null`) — rows survive, link drops.
- Some accounts are "protected" (see `protected-account.ts`) — guard delete.
- `institutionSlug` resolves theme/logo via constants; unknown slugs fall back.

## Cross-module deps

- **transactions** and **savings**: both carry `paymentAccountId` and feed balance.
- **recurring**: rules carry `paymentAccountId`.
- **dashboard**: account cards row shows balances.

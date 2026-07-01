# Transactions module

> Read before editing `src/features/transactions/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Core ledger: every money-in / money-out event, plus self-transfers between the user's
own accounts. Most other analytics derive from this table.

## File tree

```text
transactions/
  api/transactions-api.ts              # client fetch: list/create/update/delete
  schemas/transaction.ts               # Zod: create/update/filter
  server/transactions-repository.ts    # DB reads/writes, duplicate detection, transfer groups
  hooks/use-transactions.ts            # query + mutations, invalidation
  store/transaction-filters-store.ts   # table filter UI state
  store/quick-add-transaction-store.ts # quick-add sheet state
  components/transaction-form-sheet.tsx      # create/edit drawer
  components/transaction-table-filters.tsx   # filter bar
  components/transactions-page-content.tsx   # page shell + DataTable
  types/transaction.ts
  utils/transaction-category.ts        # category resolution/labels
  utils/transaction-currency.ts        # source vs ledger currency display
  utils/transaction-display.ts         # row formatting
  utils/transaction-duplicate.ts       # client dupe hints
  utils/transfer-direction.ts          # in/out direction for transfers
```

## Data model — `transactions` table

`id · userId · title · amount(text) · type(income|expense|transfer) · categoryId ·
paymentAccountId(→ set null) · sourceAmount · sourceCurrency(def USD) · exchangeRate(def 1) ·
source · transferGroupId · note · status(def confirmed) · happenedAt · createdAt · updatedAt`

- **Amounts are `text`** (decimal-as-string) — never parse to JS float for storage math;
  use the amount helpers.
- **Self-transfers** link two rows via `transferGroupId`.
- **Foreign currency**: `sourceAmount`/`sourceCurrency`/`exchangeRate` store the original;
  `amount` is in ledger currency. Server converts.
- `status` defaults `confirmed`; drafts flow via `api/transactions/drafts`.

## Routes

- Page: `/transactions`
- API: `/api/transactions`, `/api/transactions/$id`,
  `/api/transactions/drafts`, `/api/transactions/drafts.$id`

## Rules & gotchas

- **Expense vs transfer**: paying another person is an **expense**, even if titled
  "transfer". `transfer` type = between the user's OWN accounts only. See domain doc.
- **Duplicate detection** (server): create is skipped when title + amount + type +
  calendar day match an existing row; returns `duplicate: true` + `existingTransactionId`.
- Category is optional for income; expense/transfer classify with it.
- Invalidate `queryKeys.transactions.all` after any write (and dashboard/analytics read
  from this table — they invalidate via their own keys).

## Cross-module deps

- **payment-accounts**: `paymentAccountId` drives account balance math.
- **categories**: `categoryId` classification.
- **recurring**: recurring rules generate transactions; deleting the source transaction
  purges its rule (FK cascade).
- **analytics / dashboard**: read this table for all spending/income metrics.

# Money Diary — Domain Knowledge

Reference for humans and AI agents: what the product means, how entities relate, and non-obvious business rules.

## Core entities

| Entity | Purpose | Distinct from |
|--------|---------|---------------|
| **Transaction** | Money in/out between user and the world, or self-transfers between own accounts | Savings ledger |
| **Saving** | Ledger entry for money moved **into** or **out of** savings pools | Everyday purchases (unless explicitly from savings) |
| **Goal** | Financial target with progress tracking | Wishlist |
| **Wishlist item** | Something the user wants to buy someday | Goals |
| **Category** | Classifies expense/transfer transactions | Not used for income (optional) |
| **Payment account** | Card, wallet, cash, or bank the user pays from / saves from | — |

## Transaction types

| Type | Meaning | Examples |
|------|---------|----------|
| `income` | Money received | Salary, gift, refund |
| `expense` | Money spent or paid to someone/something else | Groceries, paying a friend, Netflix |
| `transfer` | **Self-transfer only** — between the user's own accounts | Cash on hand → Meezan Bank |

**Critical:** Payments to other people (even if titled "Transfer" or a person's name) are **expenses**, not transfers. Ask once if ambiguous.

## Savings ledger

Savings is **not** a substitute for transactions. It tracks movement of money into/out of savings pools.

| `entryType` | Meaning | Effect on net saved |
|-------------|---------|---------------------|
| `deposit` (default) | Money moved **into** savings | Increases total saved |
| `withdrawal` | Money taken **out of** savings (spent or moved back) | Decreases total saved |

Amounts are always stored as **positive** numbers. Sign is applied by `entryType` via `getSavingLedgerDelta()` in `src/features/savings/utils/saving-ledger.ts`.

### Payment account linkage

When a saving row has `paymentAccountId`:

- **Deposit:** money leaves that account (account balance decreases).
- **Withdrawal:** money returns to that account (account balance increases).

### Goal linkage

- `goalId` links a saving entry to a financial goal.
- Goal progress uses **net** linked savings (deposits minus withdrawals) plus declared `currentAmount` / `savingsAmount` on the goal.

### User says they "spent from savings"

1. Log `create_saving` with `entryType: withdrawal` (and `goalId` when known).
2. Usually also log `create_transaction` type `expense` for the same amount/date so analytics and spending charts stay accurate.
3. If multiple goals exist and the user did not specify which pool, ask which goal or general savings.

### User describes ordinary spending

Default to `create_transaction` type `expense`. Do **not** create a savings withdrawal unless they said the money came from savings.

## Categories

| `kind` | Typical use |
|--------|-------------|
| `need` | Essentials |
| `want` | Discretionary |
| `subscription` | Recurring services |
| `charity` | Donations |
| `other` | Catch-all |

- **Global categories** (`userId` null): built-in, visible to all users; managed in admin.
- **Personal categories** (`userId` set): created by one user.

Slug is derived from name (lowercase, hyphenated). Names must produce a valid slug.

## Goals vs wishlist

| | Goal | Wishlist |
|---|------|----------|
| Intent | Financial target / milestone | Item to buy |
| Progress | `currentAmount`, `savingsAmount`, linked savings | `currentAmount` toward `targetAmount` |
| Status | `active`, `paused`, `completed` | Same |

## Dashboard and analytics

- **Dashboard** `totalSaved`: net savings in the selected date range (deposits − withdrawals).
- **Analytics** is transaction-based; savings withdrawals do not appear there unless a matching expense was logged.
- **Cash on hand** balance includes transaction deltas and signed savings deltas on the cash account.

## Currency

- User has a ledger currency in settings.
- Transactions may store `sourceAmount`, `sourceCurrency`, `exchangeRate` when logged in foreign currency.
- AI should pass user-stated currency in tools; server converts for storage.

## Admin

- Global categories: `/admin`, API `/api/admin/categories`.
- Only admins create/edit/delete global categories.

## Migrations

Schema changes live in `drizzle/`. After adding a migration SQL file, run:

```bash
pnpm drizzle-kit migrate
```

Savings `entry_type` column: migration `drizzle/0024_savings_entry_type.sql`.

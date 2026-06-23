# Money Diary Feature Modules

## 1) Transactions Module

**Purpose**
- Track money movement events.

**Owns**
- Create, update, delete, list transactions.
- Category/account-linked transaction entries.

**Core model**
- `Transaction`
  - `id`
  - `amount`
  - `type` (`income` | `expense` | `transfer`)
  - `title`
  - `categoryId`
  - `paymentAccountId` (optional)
  - `sourceAmount`, `sourceCurrency`, `exchangeRate`
  - `source`, `note`, `happenedAt`

**Routes**
- `/transactions`
- `/api/transactions`
- `/api/transactions/$id`

---

## 2) Savings Module

**Purpose**
- Track savings ledger entries and totals.

**Owns**
- Savings CRUD and goal/account linkage.

**Core model**
- `Saving`
  - `id`
  - `title`
  - `amount` (always positive; sign from entry type)
  - `entryType` (`deposit` | `withdrawal`) — deposit = into savings, withdrawal = out of savings
  - `savedAt`
  - `goalId` (optional)
  - `paymentAccountId` (optional)
  - `note`

**Ledger math**
- Net saved = sum of deposits minus withdrawals (`getSavingLedgerDelta`).
- Linked payment account: deposit decreases balance; withdrawal increases balance.

**Routes**
- `/savings`
- `/api/savings`
- `/api/savings/$id`

---

## 3) Goals Module

**Purpose**
- Track financial targets separately from wishlist.

**Owns**
- Goal CRUD and combined progress calculations.

**Core model**
- `Goal`
  - `id`
  - `title`
  - `targetAmount`
  - `currentAmount`
  - `savingsAmount`
  - `status` (`active` | `paused` | `completed`)
  - `targetDate`, `note`

**Routes**
- `/goals`
- `/api/goals`
- `/api/goals/$id`

---

## 4) Wishlist Module

**Purpose**
- Track things user wants to buy.

**Owns**
- Wishlist CRUD and saved-progress tracking.

**Core model**
- `WishlistItem`
  - `id`
  - `title`
  - `targetAmount`
  - `currentAmount`
  - `priority` (`low` | `medium` | `high`)
  - `status` (`active` | `paused` | `completed`)
  - `note`

**Routes**
- `/wishlist`
- `/api/wishlist`
- `/api/wishlist/$id`

---

## 5) Payment Accounts Module

**Purpose**
- Track card, wallet, and cash sources for transactions/savings.

**Owns**
- Payment account CRUD and account selection labels.

**Core model**
- `PaymentAccount`
  - `id`
  - `name`
  - `institutionSlug`
  - `accountType` (`debit` | `credit` | `paypak` | `wallet` | `cash` | `other`)
  - `isActive`
  - `note`

**Routes**
- `/accounts`
- `/api/payment-accounts`
- `/api/payment-accounts/$id`

---

## 6) Categories Module

**Purpose**
- Normalize transaction classification.

**Owns**
- Category listing and personal category creation.

**Core model**
- `Category`
  - `id`
  - `name`
  - `slug`
  - `kind` (`need` | `want` | `subscription` | `charity` | `other`)
  - `userId` (nullable for global categories)

**Routes**
- `/categories`
- `/api/categories`

---

## 7) Analytics + Dashboard Modules

**Purpose**
- Provide spending/income/savings visibility.

**Owns**
- Date-range based metrics and charts.
- Dashboard snapshots and recent activity.

**Routes**
- `/`
- `/analytics`

---

## 8) AI Assistant Module

**Purpose**
- Let users enter finance actions in natural language.

**Owns**
- AI side panel UI and `/api/ai/chat` tool orchestration.

**Supported tools**
- `query_user_data`
- `create_transaction`, `update_transaction`, `delete_transaction`
- `create_saving` (`entryType`: deposit | withdrawal)
- `create_goal`, `update_goal`, `delete_goal`
- `create_wishlist_item`, `update_wishlist_item`, `delete_wishlist_item`
- `get_exchange_rate` (when local/offline model path enables it)

**Behavior highlights**
- Unspecified spending → log expense transaction.
- "From savings" → savings withdrawal (+ usually matching expense).
- Self-transfer vs paying someone else → see `docs/domain-knowledge.md`.

**Security model**
- Session-authenticated API only
- Zod-validated tool arguments
- User ownership checks for referenced IDs
- Server-side execution only

**Routes**
- `/api/ai/chat`

---

## Shared UX/Platform Notes

- Drawer/sheet-based create/edit UX for major pages
- Virtualized tables (`@tanstack/react-virtual`) with internal scroll
- Query key invalidation strategy in `src/features/query-keys.ts`
- Better Auth session model with user-scoped data access

## Agent documentation

- [AI agent reference](./ai-agent-reference.md) — stack, AI architecture, delivery checklist
- [Domain knowledge](./domain-knowledge.md) — business rules and entity semantics

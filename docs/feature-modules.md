# Money Diary Feature Modules

## 1) Transactions Module

**Purpose**
- Track every money movement event.

**Owns**
- Create, edit, delete, list transactions.
- Transaction filters (date range, type, category, title).

**Core model**
- `Transaction`
  - `id`
  - `amount`
  - `type` (`income` | `expense` | `transfer`)
  - `title`
  - `categoryId`
  - `source` (where money came from / went to)
  - `date`
  - `note`
  - `createdAt`, `updatedAt`

**Routes**
- `/transactions`
- `/transactions/new`
- `/transactions/$transactionId/edit`

**Dependencies**
- Categories module
- Analytics module (read side)
- Savings module (for transfer behavior)

---

## 2) Savings Module

**Purpose**
- Track current savings and all contributions/transfers into savings.

**Owns**
- Savings ledger entries.
- Savings balance calculations.

**Core model**
- `SavingsEntry`
  - `id`
  - `amount`
  - `transactionId` (optional linkage to income/transfer transaction)
  - `source`
  - `date`
  - `note`
  - `createdAt`

**Routes**
- `/savings`
- `/savings/history`

**Dependencies**
- Transactions module (source money events)

---

## 3) Wishlist Module

**Purpose**
- Track things user wants to buy.

**Owns**
- Wishlist lifecycle and prioritization.

**Core model**
- `WishlistItem`
  - `id`
  - `title`
  - `targetAmount`
  - `priority` (`low` | `medium` | `high`)
  - `status` (`active` | `paused` | `bought` | `dropped`)
  - `note`
  - `createdAt`, `updatedAt`

**Routes**
- `/wishlist`
- `/wishlist/new`
- `/wishlist/$wishlistId`

**Dependencies**
- None required for MVP.

---

## 4) Goals Module

**Purpose**
- Track financial goals separate from wishlist.

**Owns**
- Goal definition and progress tracking.

**Core model**
- `FinancialGoal`
  - `id`
  - `title`
  - `targetAmount`
  - `currentAmount` (or derived progress)
  - `targetDate` (optional)
  - `status` (`active` | `completed` | `paused` | `cancelled`)
  - `note`
  - `createdAt`, `updatedAt`

**Routes**
- `/goals`
- `/goals/new`
- `/goals/$goalId`

**Dependencies**
- Savings module (if progress is derived from savings allocations)

---

## 5) Categories Module

**Purpose**
- Normalize spending/income classifications.

**Owns**
- Category CRUD and category metadata.

**Core model**
- `Category`
  - `id`
  - `name` (e.g. Entertainment, Subscription, Food)
  - `slug`
  - `kind` (`need` | `want` | `subscription` | `other`)
  - `color` (optional)
  - `isActive`

**Routes**
- `/categories`

**Dependencies**
- Used by Transactions and Analytics.

---

## 6) Analytics Module

**Purpose**
- Show where money is going and trend visibility.

**Owns**
- Aggregated metrics and breakdowns.

**Core outputs**
- Total income, total expense, net flow.
- Top spending categories.
- Top spending titles.
- Date-range based trend summaries.

**Routes**
- `/analytics`

**Dependencies**
- Transactions module
- Categories module
- Savings module (for savings trend widgets)

---

## 7) Dashboard Module

**Purpose**
- One-screen financial snapshot.

**Owns**
- Home overview cards and quick insights.

**Core outputs**
- Current savings
- Current expenditure
- Recent transactions
- Top category/title spend snippets

**Routes**
- `/`

**Dependencies**
- Transactions, Savings, Analytics

---

## 8) Public Pages Module

**Purpose**
- Public-facing non-auth pages for product communication and help.

**Owns**
- Landing page
- FAQ page
- Optional legal/about/contact pages

**Routes**
- `/landing` (or `/`)
- `/faq`

**Dependencies**
- UI System only (minimal data dependency for MVP)

---

## 9) Shared Platform Modules

### Auth Module
- Sign in/up/session handling via Better Auth.
- Route guards for private pages.
- Server-side session resolution and user context injection.
- Auth-aware ownership filters on user data queries.

### Database Module (Server Functions + Repository)
- DB connection lifecycle and query composition.
- Repository functions for each feature aggregate.
- Server functions as the app boundary for reads/writes.
- Transaction-safe writes for multi-step money operations.

### Middleware Module (TanStack Start)
- Request middleware chain for:
  - auth/session hydration
  - request logging and timing
  - error normalization
  - request-scoped context (db, user, requestId)
- Route/API protection middleware for authenticated areas.
- Shared middleware utilities for server routes and server functions.

### UI System
- Shared components (`src/components/ui`).
- App-level shells and layouts.
- shadcn-first UI composition for all new feature surfaces.
- Warm design tokens from `src/styles.css` are the default visual language.
- When a required shadcn primitive is missing, install it with:
  - `pnpm dlx shadcn@latest add <component>`

### Data Access Layer
- DB schema + query helpers.
- Server function boundaries and DTO mapping.

### Query Keys & Caching
- Deterministic query keys.
- Mutation invalidation strategy per feature.
- Client-side first data flow for product modules unless server-only logic is required.

---

## Recommended Folder Map

```text
src/
  features/
    transactions/
      api/
      components/
      hooks/
      schemas/
      types/
      utils/
    savings/
    wishlist/
    goals/
    categories/
    analytics/
    dashboard/
  lib/
    auth/
    db/
    middleware/
    server/
  routes/
    index.tsx
    transactions/
    savings/
    wishlist/
    goals/
    analytics/
```

## Suggested Implementation Sequence

1. Platform foundations: Auth + DB + middleware/context
2. Categories + Transactions (foundation for all money flow)
3. Savings (current savings and contribution tracking)
4. Dashboard (totals + recent data)
5. Analytics (top category/title and trends)
6. Wishlist
7. Goals
8. Public pages (landing, FAQ)
9. Hardening (tests, edge cases, empty/error states)

# Product Foundation: Money Diary Core Features

## Requirement

### Problem
An individual needs a single place to track income, expenses, savings transfers, wishlist items, and financial goals, with visibility into current balances and spending concentration by category/title.

### User Story
As a user, I want to record and classify all money movement and intent, so that I can understand my current financial position and spending behavior.

### Scope
- In scope:
  - Record transactions (income, expense, transfer-to-savings)
  - Track savings ledger and current savings total
  - Manage wishlist items (what user wants to buy)
  - Manage financial goals (purpose-driven targets)
  - Analytics for top spending categories and titles
  - Dashboard with current savings and expenditure
- Out of scope:
  - Multi-user household accounting
  - Bank account auto-sync
  - Investment portfolio tracking
  - Budget forecasting with ML

## Analysis

### Domain Notes
- Entities involved:
  - Transaction
  - SavingsEntry
  - WishlistItem
  - FinancialGoal
  - Category
  - User
- Business rules:
  - Wishlist and financial goals are separate concepts
  - Savings can be increased from income allocation or manual transfer
  - Expense analytics must support category and title grouping
  - Dashboard values are computed from ledger data, not manually entered totals

### Data and State
- Inputs:
  - Amount, title, date, category, type, source, note
  - Wishlist target amount and priority
  - Goal target amount and target date
- Outputs:
  - Current savings
  - Current expenditure (time-filtered)
  - Top categories by expense amount
  - Top titles by expense amount
- Query keys:
  - `transactions.list`
  - `transactions.metrics`
  - `savings.current`
  - `wishlist.list`
  - `goals.list`
  - `analytics.top-categories`
  - `analytics.top-titles`

### Route and UX Impact
- Routes:
  - `/` dashboard
  - `/transactions`
  - `/savings`
  - `/wishlist`
  - `/goals`
  - `/analytics`
- UI states:
  - loading
  - error
  - empty
  - success

### Cross-Cutting Architecture
- Auth:
  - Session-based auth and protected app routes
  - All user-owned data queries scoped by authenticated user id
- Database server functions:
  - Feature data access through server functions/repositories only
  - No direct DB access from route components
- Middleware:
  - Request-scoped context for `user`, `db`, and `requestId`
  - Central error normalization and request logging

### Risks and Constraints
- Incorrect categorization lowers analytics quality
- Missing validation can allow invalid negative/zero values
- Query invalidation mistakes can show stale balances

## Implementation Plan

### Step 1: Foundation and Structure
- [ ] Add auth module structure (`src/lib/auth`)
- [ ] Add database module structure (`src/lib/db` and repositories)
- [ ] Add middleware module structure (`src/lib/middleware`)
- [ ] Create feature folders in `src/features`:
  - `transactions`
  - `savings`
  - `wishlist`
  - `goals`
  - `categories`
  - `analytics`
- [ ] Create per-feature subfolders:
  - `api`
  - `components`
  - `hooks`
  - `schemas`
  - `types`
  - `utils`

### Step 2: Domain Models and Validation
- [ ] Define zod schemas for all feature inputs
- [ ] Define DB schema for entities and relations
- [ ] Add enums as literal unions/maps (not TS enums)

### Step 3: Server Functions and Data Access
- [ ] Add shared middleware/context composition for server functions and routes
- [ ] Implement CRUD server functions for transactions
- [ ] Implement savings ledger server functions
- [ ] Implement CRUD server functions for wishlist and goals
- [ ] Implement analytics endpoints for grouped totals

### Step 4: Query and Routing Integration
- [ ] Add stable query key builders
- [ ] Add route loaders for critical pages
- [ ] Add mutation invalidation for affected dashboards and lists

### Step 5: UI Implementation
- [ ] Dashboard cards for savings/expenditure and top breakdowns
- [ ] Transaction list and create/edit form
- [ ] Savings page with transfer log
- [ ] Wishlist list and status update UI
- [ ] Goals list with progress display
- [ ] Analytics page with filter controls

### Step 6: Testing and Hardening
- [ ] Unit tests for zod schemas and calculation helpers
- [ ] Integration tests for transaction -> savings -> analytics flow
- [ ] Route-level empty/error state checks

## Acceptance Criteria
- [ ] Protected routes require authenticated session
- [ ] Data reads/writes are scoped to current authenticated user
- [ ] Server functions use shared middleware/context for db and error handling
- [ ] User can add income and expense transactions with category and title
- [ ] User can move money into savings and see updated current savings
- [ ] Wishlist and goals are managed separately
- [ ] Dashboard displays current savings and expenditure
- [ ] Analytics displays highest spending categories and titles
- [ ] Date-range filtering updates analytics and totals correctly

## Task Checklist
- [ ] Requirement finalized
- [ ] Analysis finalized
- [ ] Plan approved for implementation

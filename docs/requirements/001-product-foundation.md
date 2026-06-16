# Product Foundation: Money Diary Core Features

## Requirement

### Problem
An individual needs one place to track transactions, savings, goals, wishlist items, and account-linked money flows, with clear analytics and dashboard visibility.

### User Story
As a user, I want to record and classify all money movement and intent so I can understand my current financial position.

### Scope
- In scope:
  - Transactions (`income`, `expense`, `transfer`)
  - Savings ledger entries linked to goals/accounts
  - Goals and wishlist management as separate modules
  - Payment accounts module (cards, wallets, cash)
  - Dashboard and analytics with date range filtering
  - AI-assisted natural-language entry (tool-based)
- Out of scope:
  - Bank auto-sync
  - Investment tracking
  - Multi-household accounting

## Analysis

### Domain Notes
- Entities:
  - Transaction
  - Saving
  - Goal
  - WishlistItem
  - Category
  - PaymentAccount
  - User
- Business rules:
  - Wishlist is separate from goals
  - Savings can be linked to goals and payment accounts
  - Goal progress combines logged progress + in-savings + linked savings
  - AI writes must be user-scoped and validated server-side

### Data and State
- Inputs:
  - Amount/title/date/type/category/account/goal/note
- Outputs:
  - Current savings
  - Expenditure and income totals
  - Top categories/titles
  - Goal progress and still-needed values
- Query keys:
  - `transactions.all`
  - `savings.all`
  - `goals.all`
  - `wishlist.all`
  - `categories.all`
  - `paymentAccounts.all`

### Route and UX Impact
- Main routes:
  - `/`
  - `/transactions`
  - `/savings`
  - `/goals`
  - `/wishlist`
  - `/categories`
  - `/accounts`
  - `/analytics`
- API routes added under `/api/*`
- UI states handled:
  - loading, error, empty, success

### Risks and Constraints
- Incorrect category/account resolution can reduce analytics quality
- AI tool calls must be constrained to safe server functions
- Query invalidation errors can cause stale views

## Implementation Plan

### Step 1: Foundation and Structure
- [x] Organize feature modules under `src/features`
- [x] Add server helpers for API guards, body parsing, rate limiting

### Step 2: Domain Models and Validation
- [x] Extend schema for goals↔savings and payment accounts
- [x] Add input validation in API routes

### Step 3: Server Layer
- [x] Implement CRUD repositories for transactions/savings/goals/wishlist/payment accounts
- [x] Add API routes for each module
- [x] Add AI tool endpoint (`/api/ai/chat`) with ownership checks

### Step 4: Query + Routing
- [x] Add feature API clients and hooks
- [x] Add deterministic query keys and invalidation flow

### Step 5: UI
- [x] Add module pages (`accounts`, `analytics`, `goals`, `savings`, `wishlist`, `categories`)
- [x] Use drawer/sheet create-edit flows
- [x] Add skeleton states
- [x] Add virtualized data table and app-shell refresh controls
- [x] Add AI assistant panel

### Step 6: Testing and Hardening
- [ ] Add automated tests for helper calculations and AI route behavior
- [ ] Add integration tests for transaction/saving/goal linking flows

## Acceptance Criteria
- [x] Protected routes require authenticated session
- [x] Data reads/writes are scoped to current authenticated user
- [x] User can add income/expense transactions with category and account
- [x] User can log savings and link to goals
- [x] Wishlist and goals are managed separately
- [x] Dashboard and analytics render current finance insights
- [x] Date-range filtering updates dashboard/analytics results
- [x] AI endpoint validates tool calls and enforces user ownership checks

## Task Checklist
- [x] Requirement finalized
- [x] Analysis finalized
- [x] Implementation completed
- [ ] Regression test pass documented

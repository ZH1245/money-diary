# Money Diary

A TanStack Start application for personal money tracking with clear separation between:
- daily transactions (income and expenses)
- savings movements
- wishlist items
- financial goals
- analytics by category/title/date range

## Product Scope

This app helps one person track:
- money received and money spent
- what portion is moved into savings
- wishlist items (things to buy)
- financial goals (purpose-driven money targets, separate from wishlist)
- category and title based spending patterns (e.g. Netflix, game, AI subscriptions)

Core views:
- current savings
- current expenditure
- top spending categories
- top spending titles

Architectural approach:
- Client-side first for product features and interactions
- TanStack Start remains the centralized routing/platform layer
- Public pages (marketing/help) can be added as standard routes (e.g. landing page, FAQ)

## Tech Stack

- TanStack Start (Router-first full-stack framework)
- TanStack Router
- TanStack Query
- React + TypeScript
- Drizzle + PostgreSQL
- Tailwind CSS + shadcn/ui

## Requirements Workflow

All new features must start in `docs` before coding:

1. Create or update a feature requirement doc in `docs/requirements/`
2. Fill sections in this order:
   - Requirement
   - Analysis
   - Implementation Plan
   - Acceptance Criteria
   - Task Checklist
3. Implement only after the doc has explicit scope boundaries

Use the template in `docs/requirements/_template.md`.

## Report Export (PDF)

- Templates:
  - `docs/pdf/report-template.md`
  - `docs/pdf/report-template.html`
- Export guide:
  - `docs/pdf/README.md`

## Getting Started

```bash
pnpm install
pnpm dev
```

## Environment Setup

1. Copy env values:
   ```bash
   cp .env.example .env.local
   ```
2. Update database and auth values in `.env.local`

## Database via Docker (PostgreSQL only)

```bash
docker compose up -d postgres
```

Default local connection:

```text
postgresql://postgres:postgres@localhost:5432/money_diary
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm lint
pnpm format
pnpm check
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

## Feature Breakdown

Planned feature modules under `src/features`:
- `transactions`
- `savings`
- `wishlist`
- `goals`
- `categories`
- `analytics`

Route groups:
- `/transactions`
- `/savings`
- `/wishlist`
- `/goals`
- `/analytics`

## References

- [TanStack Start docs](https://tanstack.com/start/latest)

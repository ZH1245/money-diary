# Money Diary

Money Diary is a TanStack Start app for personal finance tracking across transactions, savings, goals, wishlist items, and analytics.

## What It Supports

- Transactions (`income`, `expense`, `transfer`)
- Savings ledger entries (optionally linked to goals and accounts)
- Goals with combined progress (`logged + in-savings + linked savings`)
- Wishlist tracking (separate from goals)
- Payment accounts (cards, wallets, cash)
- Dashboard and analytics with date-range filters
- AI assistant panel for natural-language entry (transaction/saving/goal/wishlist)

## Tech Stack

- TanStack Start + TanStack Router + TanStack Query
- React + TypeScript
- Drizzle ORM + PostgreSQL
- Tailwind CSS + shadcn/ui
- Recharts
- Ollama (optional, for local AI assistant)

## Getting Started

```bash
pnpm install
pnpm dev
```

## Environment Setup

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Configure DB/auth values in `.env.local`.

## Database via Docker (PostgreSQL)

```bash
docker compose up -d postgres
```

Default local connection:

```text
postgresql://postgres:postgres@localhost:5432/money_diary
```

## AI Assistant (Optional)

The app includes `/api/ai/chat` for tool-based AI writes.

To use local Ollama:

```bash
ollama serve
ollama pull qwen3.5:4b
```

AI write security model:

- API is session-protected (`requireUserContext`)
- Tool calls are validated with Zod
- Account/category/goal ownership is checked per user
- `userId` always comes from session, never from model output

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

## UX Notes

- Create/edit operations use drawer/sheet flows on major finance pages
- Data tables use TanStack Virtual row virtualization with internal scroll containers
- Loading states use skeletons for primary pages

## References

- [TanStack Start docs](https://tanstack.com/start/latest)

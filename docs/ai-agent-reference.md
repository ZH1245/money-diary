# AI Agent Reference — Money Diary

Guide for coding agents and knowledge systems working in this repository. Read this with `docs/domain-knowledge.md` and `.cursorrules`.

## Stack and boundaries

| Layer | Technology |
|-------|------------|
| App framework | TanStack Start, TanStack Router, TanStack Query |
| UI | React, TypeScript, Tailwind, shadcn/ui |
| Data | Drizzle ORM, PostgreSQL |
| Auth | Better Auth (session-scoped APIs) |
| AI chat | OpenRouter or Ollama via `/api/ai/chat` |

**Rules:**

- DB and secrets: server-only (`src/features/*/server/`, `src/routes/api/`).
- Never expose secrets in client code (`VITE_*` is public).
- Validate all external input with Zod.
- API-first: endpoints + OpenAPI before feature UI.
- Co-locate features under `src/features/<name>/`.

## Repository layout

```text
src/
  features/
    transactions/   # money in/out
    savings/        # savings ledger (deposit | withdrawal)
    goals/
    wishlist/
    categories/
    payment-accounts/
    analytics/
    dashboard/
    ai/             # prompt, tools, executor, chat service
  routes/           # TanStack route files + API handlers
  db/               # schema, migrations index
docs/
  domain-knowledge.md      # business rules (this file's companion)
  feature-modules.md       # module map
  ai-agent-reference.md    # this file
drizzle/              # SQL migrations
```

Per-feature shape: `api/` or `server/`, `components/`, `hooks/`, `schemas/`, `types/`, `utils/`.

## Delivery order (features)

1. DB schema + migration
2. Server repository + API route + Zod schemas
3. OpenAPI entry in `src/routes/api/openapi.json.ts`
4. Query keys + hooks
5. UI (loading / empty / error states required)

## AI assistant architecture

```text
POST /api/ai/chat
  → runAiChat (ai-chat-service)
  → buildSecureSystemPrompt (ai-prompt-builder)
  → getAiConversationModelMessages (ai-history-window, SQL-limited)
  → callOpenRouterChat / Ollama
  → tool calls → executeAiTool (ai-tool-executor)
```

| File | Role |
|------|------|
| `ai-prompt-builder.ts` | System prompt, task/transfer/savings rules |
| `ai-tools.ts` | OpenAI-style tool definitions |
| `ai-tool-executor.ts` | Zod parse + DB writes per tool |
| `ai-user-data-query.ts` | `query_user_data` reads (capped rows, full-set totals in summary line) |
| `ai-history-window.ts` | Last N messages from DB |

### Write tools

- `create_transaction`, `update_transaction`, `delete_transaction`
- `create_saving` — `entryType`: `deposit` \| `withdrawal` (default `deposit`)
- `create_goal`, `update_goal`, `delete_goal`
- `create_wishlist_item`, `update_wishlist_item`, `delete_wishlist_item`
- `get_exchange_rate` (when enabled for offline/local models)

### AI behavior (must match product)

| User intent | Agent action |
|-------------|--------------|
| Spent/bought/paid, no other context | `create_transaction` **expense** |
| Received income | `create_transaction` **income** |
| Move between own accounts | `create_transaction` **transfer** (confirm if ambiguous) |
| Pay another person | **expense**, not transfer |
| Put money into savings | `create_saving` **deposit** |
| Spent **from** savings | `create_saving` **withdrawal** + usually matching **expense** |
| From savings, goal unclear, multiple goals | Ask which goal or general savings (one question) |
| Data questions | `query_user_data` — never guess totals |

Prompt source of truth: `buildSecureSystemPrompt()` in `ai-prompt-builder.ts`. Domain narrative: `docs/domain-knowledge.md`.

### Token / cost notes (OpenRouter)

- Legal docs are **not** embedded in the system prompt; users are directed to `/privacy` and `/terms`.
- History is bounded in SQL (recent messages only).
- `OPENROUTER_MAX_OUTPUT_TOKENS` capped (see `openrouter-defaults.ts`).
- `query_user_data` returns truncated lists with full-set aggregate lines.

## Savings implementation map

| Concern | Location |
|---------|----------|
| Signed ledger math | `src/features/savings/utils/saving-ledger.ts` |
| Page stats | `src/features/savings/utils/savings-stats.ts` |
| Dashboard net saved | `src/features/dashboard/utils/dashboard-stats.ts` |
| Account balances | `src/features/payment-accounts/utils/payment-account-balance.ts` |
| Goal linked totals | `src/features/goals/utils/goal-progress.ts` |
| API | `src/routes/api/savings.ts`, `$id.ts` |
| Schema | `entryType` on `savings` table |

## UI patterns

- Create/edit: **Sheet** (drawer), not full-page forms for ledger entities.
- Sheet layout: `SheetContent className="w-full sm:max-w-md"`, form `grid gap-4 px-4`, `SheetFooter className="px-0"`, full-width submit.
- Tables: `DataTable` with sort/filter; virtualized where large.
- Forms: reset state on sheet close; `openCreateSheet` resets before open.
- shadcn: install missing primitives with `pnpm dlx shadcn@latest add <name>`.

## Git workflow

1. **Issue first** (Feature / Bug / Chore template).
2. Branch: `feat/`, `fix/`, `chore/`, `perf/` from `main`.
3. Conventional Commits with body; `Refs #N` or `Closes #N`.
4. `pnpm exec tsc --noEmit` before PR.
5. PR uses `.github/PULL_REQUEST_TEMPLATE.md`; link issue with `Closes #N`.
6. **No** vendor attribution in commits or PR bodies.

Helpers: `pnpm issue:feature`, `pnpm pr:open`, `pnpm pr:merge`.

## Quality gates

- [ ] Zod schema for new inputs
- [ ] OpenAPI updated for new/changed endpoints
- [ ] Query keys in `src/features/query-keys.ts`
- [ ] Empty / error / loading UI
- [ ] Typecheck passes
- [ ] Migration applied for schema changes

## Related docs

- [Domain knowledge](./domain-knowledge.md) — business rules and entity semantics
- [Feature modules](./feature-modules.md) — module ownership and routes
- [Product foundation](./requirements/001-product-foundation.md)
- [Account recovery](./requirements/002-account-recovery-and-encryption.md)

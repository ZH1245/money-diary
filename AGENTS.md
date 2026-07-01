# AGENTS.md — Money Diary agent context

Entry point for any coding agent (Claude Code, Cursor, Codex) working in this repo.
Read this first, then the **module context file** for whatever you touch, then the code.

> **How Claude loads this:** each `src/features/<name>/` has a thin `CLAUDE.md` that
> Claude Code auto-loads when you edit files in that dir. That stub links to the
> module's full knowledge file under [`docs/modules/`](docs/modules/). This file is the
> global index; the module files are the depth.

---

## Read order for any task

1. **This file** — stack, boundaries, global rules.
2. **[`docs/modules/<feature>.md`](docs/modules/)** — the feature you're changing: file tree,
   data model, routes, rules, cross-module deps.
3. **[`docs/domain-knowledge.md`](docs/domain-knowledge.md)** — business meaning of entities (what
   counts as expense vs transfer vs savings, etc.). Non-negotiable semantics.
4. **[`docs/ai-agent-reference.md`](docs/ai-agent-reference.md)** — AI assistant internals + delivery
   checklist (only if touching AI or shipping a feature end-to-end).
5. The actual source files.

Do not edit before reading the relevant module file. If a change spans modules, read
each module file it touches.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | TanStack Start (SSR) + TanStack Router (file-based, generated) |
| Data (client) | TanStack Query, TanStack DB, TanStack Store |
| UI | React 19, TypeScript, Tailwind v4, shadcn/ui (Radix) |
| DB | Drizzle ORM + PostgreSQL (Neon serverless / `pg`) |
| Auth | Better Auth (session-scoped) |
| Realtime | Pusher |
| AI | OpenRouter / Gemini / Ollama via `/api/ai/chat` |
| Tooling | Vite, Biome (format+lint), Vitest, pnpm, Node 20 |

Commands: `pnpm dev` · `pnpm build` · `pnpm test` · `pnpm check` (biome) ·
`pnpm exec tsc --noEmit` (typecheck) · `pnpm db:generate` / `db:migrate` (Drizzle).

---

## Hard rules (apply everywhere)

- **Server-only boundary.** DB access, secrets, encryption, provider keys live only in
  `src/features/*/server/`, `src/lib/server/`, and `src/routes/api/`. Never import these
  from client components/hooks. `VITE_*` env is public — never put secrets there.
- **Validate at the edge.** Every external input (API body, route param, AI tool args)
  parsed with a Zod schema before use. Schemas live in `src/features/<f>/schemas/`.
- **Ownership.** All user data is scoped by `userId`. Every read/write filters by the
  session user; ID references (categoryId, goalId, paymentAccountId…) are ownership-checked
  server-side (`src/lib/server/ownership-guards.ts`). Admin routes gated by
  `src/lib/server/admin-guard.ts`.
- **API-first.** New feature → schema + repository + API route + OpenAPI entry **before**
  UI. See delivery order below.
- **Types.** `strict`. No `any` (use `unknown` + narrow). Named exports for utils.
- **No secrets/keys in commits.** No vendor/AI attribution in commit or PR bodies.

---

## Feature anatomy (every module follows this)

```text
src/features/<name>/
  api/         # client-side fetch wrappers (call /api/*, return typed data)
  components/  # feature-scoped React UI
  constants/   # static config (institutions, providers, questions…)
  hooks/       # TanStack Query hooks (use-*), wrap api/ + query keys
  schemas/     # Zod schemas — the validation source of truth
  server/      # SERVER-ONLY: repositories (DB), services, guards
  store/       # TanStack Store (client UI state: filters, sheets, ranges)
  types/       # TS types / derived shapes
  utils/       # pure helpers (math, formatting, mapping) — no side effects
```

Not every feature has all folders. UI-only features (landing, legal) have no `server/`.

## Delivery order (shipping a feature)

1. DB schema + migration (`src/db/schema.ts` → `pnpm db:generate` → `db:migrate`).
2. Zod schemas → server repository → API route handler.
3. OpenAPI entry in `src/routes/api/openapi.json.ts`.
4. Query keys in [`src/features/query-keys.ts`](src/features/query-keys.ts) → hooks.
5. UI — must include loading / empty / error states.

Quality gate before PR: Zod on new inputs · OpenAPI updated · query keys added ·
empty/error/loading UI · `pnpm exec tsc --noEmit` clean · migration applied.

---

## Cross-cutting anchors

| Concern | Location |
|---------|----------|
| DB schema (all tables) | [`src/db/schema.ts`](src/db/schema.ts), auth in `auth-schema.ts` |
| Query keys / invalidation | [`src/features/query-keys.ts`](src/features/query-keys.ts) |
| Server guards (auth, admin, ownership, rate-limit, encryption) | [`src/lib/server/`](src/lib/server/) |
| Auth client / roles | `src/lib/auth-client.ts`, `src/lib/auth-roles.ts` |
| API routes + OpenAPI | `src/routes/api/`, `src/routes/api/openapi.json.ts` |
| Shared UI primitives | `src/components/ui/` (shadcn), `src/components/data-table/` |
| Currency / dates / timezone | `src/lib/currency.ts`, `src/lib/date-input.ts`, `src/lib/timezone.ts` |

---

## Module index

Each links to its full context file. `→ table` means the module owns a DB table.

| Module | Owns | Context file |
|--------|------|--------------|
| Transactions → table | Money in/out + self-transfers | [transactions.md](docs/modules/transactions.md) |
| Savings → table | Savings ledger (deposit/withdrawal) | [savings.md](docs/modules/savings.md) |
| Goals → table | Financial targets + progress | [goals.md](docs/modules/goals.md) |
| Wishlist → table | Things to buy | [wishlist.md](docs/modules/wishlist.md) |
| Payment accounts → table | Cards/wallets/cash sources + balances | [payment-accounts.md](docs/modules/payment-accounts.md) |
| Categories → table | Transaction classification (global + personal) | [categories.md](docs/modules/categories.md) |
| Recurring → table | Recurring transaction rules + cron | [recurring.md](docs/modules/recurring.md) |
| AI → tables | NL finance assistant, tools, chat | [ai.md](docs/modules/ai.md) |
| Analytics | Transaction-based metrics/charts | [analytics.md](docs/modules/analytics.md) |
| Dashboard | Home snapshot, wealth, upcoming | [dashboard.md](docs/modules/dashboard.md) |
| Auth | Sign-in/up, recovery, security profile | [auth.md](docs/modules/auth.md) |
| Admin → tables | Users, bans, global AI/categories, tickets | [admin.md](docs/modules/admin.md) |
| Feedback → tables | Support tickets + threads | [feedback.md](docs/modules/feedback.md) |
| Settings → table | User AI provider + currency prefs | [settings.md](docs/modules/settings.md) |
| Exchange rates | FX fetch/convert | [exchange-rates.md](docs/modules/exchange-rates.md) |
| Legal | Privacy policy + ToS content | [legal.md](docs/modules/legal.md) |
| Privacy | Privacy (blur) mode toggle | [privacy.md](docs/modules/privacy.md) |
| Landing | Marketing/landing page | [landing.md](docs/modules/landing.md) |
| Shared | Cross-feature pure utils | [shared.md](docs/modules/shared.md) |

---

## Companion docs

- [Domain knowledge](docs/domain-knowledge.md) — entity semantics + business rules
- [AI agent reference](docs/ai-agent-reference.md) — AI internals, UI patterns, git workflow
- [Feature modules index](docs/modules/README.md) — same index, doc-side

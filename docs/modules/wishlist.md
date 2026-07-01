# Wishlist module

> Read before editing `src/features/wishlist/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Things the user wants to buy someday, with saved-progress tracking. Distinct from goals
(financial milestones).

## File tree

```text
wishlist/
  api/wishlist-api.ts
  schemas/wishlist.ts
  server/wishlist-repository.ts
  hooks/use-wishlist.ts
  components/wishlist-page-content.tsx
  types/wishlist.ts
  utils/wishlist-form.ts
  utils/wishlist-stats.ts
```

## Data model — `wishlist_items` table

`id · userId · title · targetAmount(text) · currentAmount(text, def 0) ·
priority(low|medium|high, def medium) · status(active|paused|completed, def active) ·
note · createdAt · updatedAt`

## Routes

- Page: `/wishlist`
- API: `/api/wishlist`, `/api/wishlist/$id`

## Rules & gotchas

- Progress is simple: `currentAmount` toward `targetAmount`. No savings-ledger linkage
  (unlike goals).
- `priority` and `status` are free enums validated in the Zod schema.

## Cross-module deps

- Standalone. No FK links to other feature tables.

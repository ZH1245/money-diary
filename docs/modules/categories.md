# Categories module

> Read before editing `src/features/categories/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Classify expense/transfer transactions. Two kinds: **global** categories (built-in, all
users) and **personal** categories (one user).

## File tree

```text
categories/
  api/categories-api.ts
  schemas/category.ts
  server/categories-repository.ts
  hooks/use-categories.ts
  components/categories-page-content.tsx
  components/category-table.tsx
  types/category.ts
  utils/category-form.ts
  utils/category-slug.ts               # name → slug (lowercase, hyphenated)
```

## Data model — `categories` table

`id · name · slug · kind(need|want|subscription|charity|other) · userId(NULLABLE) ·
createdAt · updatedAt`  — unique on (userId, slug).

- **`userId` null = global category** (managed in admin). Set = personal.

## Routes

- Page: `/categories`
- API: `/api/categories`, `/api/categories/$id`
- Global categories managed via admin: `/api/admin/categories`.

## Rules & gotchas

- Slug is derived from name (`category-slug.ts`); a name must produce a valid, unique slug
  per user. Uniqueness is (userId, slug).
- Only admins create/edit/delete **global** categories (`userId` null) — user routes must
  not touch global rows.
- Income transactions don't require a category.

## Cross-module deps

- **transactions**: `categoryId` classification.
- **admin**: global category management (`admin/server/global-categories-repository.ts`).

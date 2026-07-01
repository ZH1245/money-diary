# Goals module

> Read before editing `src/features/goals/`.
> Global: [AGENTS.md](../../AGENTS.md) · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Financial targets/milestones with progress tracking. Distinct from wishlist (goals are
targets to save toward; wishlist items are things to buy).

## File tree

```text
goals/
  api/goals-api.ts
  schemas/goal.ts
  server/goals-repository.ts
  hooks/use-goals.ts
  components/goals-page-content.tsx
  components/goals-analytics-section.tsx
  types/goal.ts
  types/goal-stats.ts
  utils/goal-form.ts
  utils/goal-progress.ts               # combined progress (declared + linked savings)
  utils/goals-analytics.ts
```

## Data model — `goals` table

`id · userId · title · targetAmount(text) · currentAmount(text, def 0) · savingsAmount(text, def 0) ·
targetDate? · status(active|paused|completed, def active) · note · createdAt · updatedAt`

## Routes

- Page: `/goals`
- API: `/api/goals`, `/api/goals/$id`

## Rules & gotchas

- Progress = declared `currentAmount` + `savingsAmount` **plus net linked savings**
  (deposits − withdrawals of `savings` rows with this `goalId`). Compute via
  `goal-progress.ts`, don't sum inline.
- Deleting a goal sets linked savings `goalId` to null (FK `set null`), it does not
  delete those savings rows.

## Cross-module deps

- **savings**: linked savings drive net progress.
- **dashboard/analytics**: goal progress surfaced in summaries.

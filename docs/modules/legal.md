# Legal module

> Read before editing `src/features/legal/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

Privacy Policy and Terms of Service content + rendering. Content-only, no DB, no API.

## File tree

```text
legal/
  content/privacy-policy.ts            # policy source text
  content/terms-of-service.ts          # terms source text
  components/privacy-policy-content.tsx
  components/terms-of-service-content.tsx
  utils/legal-knowledge.ts             # summary for product/AI reference
```

## Routes

- Pages: `/privacy`, `/terms`

## Rules & gotchas

- Legal text is **not** embedded in the AI system prompt (cost) — users are directed to
  `/privacy` and `/terms`.
- Editing policy/terms is a compliance action — follow `.cursor/rules/privacy-policy-updates.mdc`
  if present (update effective date, keep both content + rendered in sync).

## Cross-module deps

- Referenced by **landing** (privacy section) and **ai** (product knowledge points to it).

# Privacy (blur) mode module

> Read before editing `src/features/privacy/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

Client-side "privacy mode" toggle that blurs monetary amounts in the UI (shoulder-surfing
protection). Not related to the legal Privacy Policy — that's [legal.md](legal.md).

## File tree

```text
privacy/
  store/privacy-mode-store.ts          # TanStack Store: on/off flag
```

Related: `src/lib/privacy/`, `src/components/privacy/` (the blur wrappers/UI).

## Rules & gotchas

- Pure client state — no server, no persistence beyond the store (check store for
  localStorage behavior before changing).
- Amount-displaying components read this flag to blur; keep the toggle cheap (no re-fetch).

## Cross-module deps

- Consumed by any component rendering amounts (dashboard, transactions, analytics, …).

# Landing module

> Read before editing `src/features/landing/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

Public marketing/landing page (unauthenticated). UI-only: hero, feature grid, device
mockups, theme showcase, privacy section.

## File tree

```text
landing/
  components/landing-page.tsx           # page composition
  components/landing-nav.tsx
  components/feature-grid.tsx · feature-showcase.tsx
  components/device-mockups.tsx · landing-device-frames.tsx
  components/themes-showcase.tsx · landing-themes.ts
  components/landing-screenshots.ts     # screenshot asset refs
  components/privacy-section.tsx
  components/landing-ui-bits.tsx
```

## Routes

- Page: `/` (index). Authenticated users are redirected into the app
  (`authenticated-entry-redirect`).

## Rules & gotchas

- Must render for crawlers/SSR (SEO) — keep it server-renderable, avoid auth-gated data.
- Screenshots captured as PNG via `pnpm capture:landing`, then `pnpm optimize:landing`
  converts to WebP, generates `-768` / `-240` srcset variants, and deletes PNGs.
- No DB/API. Pure presentation.

## Cross-module deps

- **auth**: redirect logged-in users. **legal**: privacy section links.

# Settings module

> Read before editing `src/features/settings/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

User preferences: AI provider config (per-user or use-global) and ledger currency. Also
the About section.

## File tree

```text
settings/
  components/settings-page-layout.tsx
  components/ai-settings-section.tsx
  components/about-section.tsx
  constants/ai-provider-ids.ts · ai-providers.ts
  constants/openrouter-defaults.ts · openrouter-models.ts
  server/settings-repository.ts
  server/ai-connection-test.ts          # validate provider creds
  utils/ai-model-config.ts
```

## Data model — `ai_provider_settings` (per-user row)

`userId · provider(def ollama) · useGlobalProvider(def true) · isEnabled(def false) ·
baseUrlEncrypted? · modelEncrypted? · apiKeyEncrypted? · updatedBy? · timestamps`

- The **global** row (userId null) is the admin default; user row overrides when
  `useGlobalProvider` is false. Resolution: `admin/server/resolve-ai-provider.ts`.

## Routes

- Page: `/settings`
- API: `/api/settings/ai(/key, /test)`, `/api/settings/currency`

## Rules & gotchas

- **Encrypted at rest**: baseUrl/model/apiKey stored encrypted; `/key` route sets, never
  returns the raw key. `/test` validates a connection without exposing the secret.
- Currency change updates the user's ledger currency — affects how new transaction amounts
  are stored/converted (see [exchange-rates.md](exchange-rates.md), transactions currency fields).

## Cross-module deps

- **ai / admin**: provider resolution (user vs global).
- **exchange-rates / transactions**: ledger currency preference.

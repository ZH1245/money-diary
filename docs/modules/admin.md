# Admin module

> Read before editing `src/features/admin/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

Admin-only console: manage users, bans (email/IP), global AI provider settings, global
categories, and support tickets.

## File tree

```text
admin/
  api/admin-bans-api.ts · admin-reset-link-api.ts
  schemas/admin-ban.ts · admin-settings.ts · admin-user.ts
  hooks/use-admin-bans.ts
  components/admin-users-section.tsx
  components/admin-bans-section.tsx
  components/admin-global-ai-section.tsx
  components/admin-global-categories-section.tsx
  components/openrouter-models-editor.tsx
  server/                              # SERVER-ONLY, admin-gated
    admin-users-repository.ts
    admin-bans-repository.ts
    admin-password-reset-repository.ts
    global-ai-settings-repository.ts
    global-categories-repository.ts
    resolve-ai-provider.ts            # global-vs-user provider resolution
  types/admin-ban.ts · admin-user.ts
```

## Data model

- `bans` (`targetType email|ip · email? · ipAddress? · reason · expiresAt?(null=permanent) · isActive`)
- `password_reset_tokens` (admin-issued reset links; hash only)
- Global AI config: `ai_provider_settings` row with `userId` null (unique global row).
- Global categories: `categories` rows with `userId` null.

## Routes

- Page: `/admin`
- API: `/api/admin/users(/$id, /$id/reset-link)`, `/api/admin/bans(/$id)`,
  `/api/admin/categories(/$id)`, `/api/admin/global-ai(/key, /test, /openrouter-models)`,
  `/api/admin/tickets(/$id, /$id/messages)`

## Rules & gotchas

- **Every admin route MUST go through `src/lib/server/admin-guard.ts`.** Never expose
  admin repositories to non-admin sessions.
- Global AI key stored **encrypted** (`ai_provider_settings.apiKeyEncrypted`); never
  return the raw key to the client — only enabled/model metadata.
- Bans: `expiresAt` null = permanent; check `isActive` + expiry when enforcing.
- Global categories = `userId` null; don't mix with personal category writes.

## Cross-module deps

- **auth**: bans + reset links act on auth users.
- **ai / settings**: global provider config feeds `resolve-ai-provider.ts`.
- **categories**: global category CRUD.
- **feedback**: admin ticket views/responses.

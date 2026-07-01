# Auth module

> Read before editing `src/features/auth/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

Sign-in/up, password change, account recovery (security questions + email), and the
security profile. Built on Better Auth; adds moderation (ban) + recovery layers.

## File tree

```text
auth/
  api/security-profile-api.ts
  schemas/security-profile.ts
  constants/security-questions.ts
  errors/recovery-email-errors.ts
  hooks/use-security-profile.ts
  hooks/use-account-moderation-guard.ts   # blocks banned/suspended users
  components/authenticated-entry-redirect.tsx
  components/change-password-section.tsx
  components/security-profile-fields.tsx
  components/security-profile-section.tsx
  components/security-setup-form.tsx
  server/user-security-repository.ts
```

Related shared libs: `src/lib/auth.ts`, `auth-client.ts`, `auth-roles.ts`,
`use-auth-session.ts`; server guards in `src/lib/server/` (recovery-rate-limit,
security-answer, encryption). Better Auth schema in `src/db/auth-schema.ts`.

## Data model

- Better Auth `user`/session tables (`auth-schema.ts`).
- `password_reset_tokens` (only token **hash** stored) — see admin/recovery flows.
- Security profile fields stored per user (answers are hashed/encrypted server-side).

## Routes

- Pages: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`,
  `/setup-security`, `/account-suspended`
- API: `/api/auth/$` (Better Auth catch-all), `change-password`, `moderation-status`,
  `security-profile`, `sign-in-moderation`, `reset-password-token`,
  `recovery/challenge`, `recovery/reset`

## Rules & gotchas

- **Secrets**: security answers and reset tokens are hashed/encrypted — never store or log
  raw values. Only the token hash is persisted (`password_reset_tokens.tokenHash`).
- **Rate limiting**: recovery + sign-in paths are rate-limited (`src/lib/server/`), don't
  bypass.
- **Moderation**: `use-account-moderation-guard` + `sign-in-moderation` enforce bans; a
  banned user is redirected to `/account-suspended`.
- All app data routes require a session — use `authenticated-route.ts` guards.

## Cross-module deps

- **admin**: bans + admin-initiated password resets act on auth entities.
- Session identity (`userId`) underlies every other module's ownership scoping.

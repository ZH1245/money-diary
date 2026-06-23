# Money Diary — Code Review & Remediation Tasks

Date: 2026-06-23
Reviewer: automated full-repo pass
Scope reviewed: cross-cutting infra (auth, encryption, AI, recovery, rate limiting, db, env, deploy config) + representative CRUD path.

## How to use this doc

Each task below has a **paste block** — a self-contained prompt for an AI coding agent. Hand them off one at a time, in priority order (HIGH → MEDIUM → LOW). After each, run `pnpm check` (biome) and `pnpm build` to confirm nothing broke.

Verification commands for this repo:
- `pnpm check` — biome lint + format
- `pnpm build` — production build
- `pnpm test` — vitest

---

## What's already good (do not regress)

- **CRUD ownership scoping is solid.** Every transactions/goals/savings/categories/payment-accounts query is scoped by `userId` in the `WHERE` clause. `rejectClientSuppliedUserId` blocks client-supplied ids in query + body. Drizzle parameterizes all queries — no SQL injection surface found.
- **AES-256-GCM** with random per-value IV and auth tag for stored secrets — correct construction.
- **Session revocation on password reset/change** — good.

---

# HIGH — security / correctness

## 1. In-memory rate limit + abuse state broken on serverless

**Where:** `src/lib/server/rate-limit.ts`, `src/lib/server/recovery-rate-limit.ts`, `abuseBuckets` in `src/features/ai/server/ai-security.ts`
**Problem:** `vercel.json` targets serverless. The `Map`-based buckets live per function instance — wiped on cold start, not shared across concurrent instances. Rate limits and AI abuse blocking are effectively bypassable.

**Paste block:**
```
In money-diary (Vercel/serverless TanStack Start app), the rate limiting is in-memory Maps that don't survive serverless cold starts or share across instances. Replace the in-memory buckets in src/lib/server/rate-limit.ts, src/lib/server/recovery-rate-limit.ts, and the abuseBuckets Map in src/features/ai/server/ai-security.ts with a durable shared store (Upstash Redis via @upstash/ratelimit, or a Postgres table keyed by ip:route / userId with windowed counts). Keep the same function signatures (enforceRateLimit, enforceRecoveryRateLimit, evaluateAbuseState/recordAbuseStrike) so callers don't change. Make the limiter async if needed and await it in callers. Add any new env vars to .env.example and src/env.ts. Run pnpm check and pnpm build after.
```

## 2. Recovery = single low-entropy factor → account takeover risk

**Where:** `src/routes/api/auth/recovery/reset.ts`, `resetPasswordWithSecurityAnswers` in `src/features/auth/server/user-security-repository.ts`
**Problem:** `createSecurityProfile` sets `recoveryEmail = account sign-in email`, so a reset needs: email + (same email) + **one** security answer. One guessable factor. Limit is per-IP only (10/hr) and in-memory, so rotating IPs / waiting for cold start enables brute force → full password reset.

**Paste block:**
```
In money-diary, password recovery (src/routes/api/auth/recovery/reset.ts + resetPasswordWithSecurityAnswers in src/features/auth/server/user-security-repository.ts) is single-factor: it only checks the account email plus one security answer, and recoveryEmail equals the sign-in email so it adds no entropy. Harden it: (1) add a per-account failed-attempt counter with lockout stored in Postgres (not in-memory), e.g. lock after 5 failed answer attempts for N minutes, keyed by user id; (2) require an emailed one-time reset token sent to the recovery email before allowing the answer check, OR add a second security question. Keep responses generic (don't reveal which factor failed — the existing GENERIC_RESET_FAILURE is correct). Do not weaken the existing session revocation on reset. Add a drizzle migration for any new columns/table. Run pnpm check and pnpm build after.
```

## 3. Rate-limit Map never pruned — unbounded memory growth

**Where:** `src/lib/server/rate-limit.ts`
**Problem:** Keyed by `ip:pathname`; entries are only overwritten on a same-key hit, never deleted. Many distinct IPs/paths → unbounded growth (memory pressure / DoS vector).

**Paste block:**
```
src/lib/server/rate-limit.ts grows its `buckets` Map unbounded (keyed by ip:path, never evicted). If an in-memory fallback remains, add eviction of expired buckets (sweep on each call removing entries where now >= resetAt, or cap Map size with simple LRU). Prefer folding this into the durable-store fix from the rate-limit task so the in-memory Map is removed entirely. Run pnpm check after.
```

## 4. Shared singleton `Response` objects reused across requests

**Where:** `src/lib/server/admin-guard.ts` (lines ~5-13)
**Problem:** `UNAUTHORIZED_RESPONSE` / `FORBIDDEN_RESPONSE` are module-level `Response` instances returned on every call. A `Response` body stream is single-use — reuse across concurrent requests causes empty/"body already used" responses.

**Paste block:**
```
src/lib/server/admin-guard.ts defines UNAUTHORIZED_RESPONSE and FORBIDDEN_RESPONSE as module-level singleton Response objects and returns the same instance on every call. Response bodies are single-use, so reuse across requests is a bug. Change requireAdmin to build a fresh Response.json(...) on each unauthorized/forbidden path. Keep status codes (401/403) and JSON bodies identical. Run pnpm check after.
```

---

# MEDIUM — config / robustness

## 5. `src/env.ts` validates nothing that matters

**Where:** `src/env.ts`
**Problem:** Schema only declares `SERVER_URL` + `VITE_APP_TITLE`. The real required secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `ENV_SECRETS`) are read via `process.env.X!` non-null assertions (e.g. `src/db/index.ts`). A missing var crashes mid-request instead of at boot.

**Paste block:**
```
src/env.ts (t3-oss/env-core) doesn't validate the app's real required secrets. Add to the `server` schema: DATABASE_URL (z.string().url()), BETTER_AUTH_SECRET (z.string().min(1)), ENV_SECRETS (z.string().min(1)), plus optional AI_SETTINGS_ENCRYPTION_KEY, ALLOWED_ORIGINS, APP_ALLOWED_HOSTS, DATABASE_URL_POOLER. Then replace the process.env.DATABASE_URL! non-null assertions in src/db/index.ts and the secret fallback chain in src/lib/server/encryption.ts with reads from the validated `env` object so the app fails fast at startup. Don't change runtime behavior otherwise. Run pnpm check and pnpm build after.
```

## 6. Postgres driver wrong for serverless

**Where:** `src/db/index.ts`
**Problem:** Uses `drizzle-orm/node-postgres` with a single direct connection string. On Vercel functions this exhausts connections under concurrency. `.env.example` documents `DATABASE_URL_POOLER` but the code never reads it.

**Paste block:**
```
money-diary deploys on Vercel serverless but src/db/index.ts uses drizzle-orm/node-postgres with a single direct connection. Switch the runtime db client to the Neon serverless driver (drizzle-orm/neon-http or neon-serverless with @neondatabase/serverless, already a dependency) using the pooled URL: DATABASE_URL_POOLER ?? DATABASE_URL. Keep drizzle-kit migrations pointed at the direct DATABASE_URL (do not change the migration connection in drizzle.config.ts). The exported `db` must keep the same schema object so all repositories keep working unchanged. Run pnpm build after.
```

## 7. Encryption: silent multi-source key fallback

**Where:** `src/lib/server/encryption.ts` (lines ~7-15)
**Problem:** Key = `sha256(ENV_SECRETS ?? AI_SETTINGS_ENCRYPTION_KEY ?? BETTER_AUTH_SECRET)`. If the resolved source ever changes, every stored AI key becomes undecryptable (the reveal routes already special-case this failure). Also raw sha256, no KDF/salt.

**Paste block:**
```
src/lib/server/encryption.ts derives the AES key from whichever of ENV_SECRETS / AI_SETTINGS_ENCRYPTION_KEY / BETTER_AUTH_SECRET is set first. This silent fallback means changing which var is present silently breaks decryption of all stored secrets. Pin the key to a single required source (ENV_SECRETS) read from the validated env (see the env.ts task); throw a clear error if absent. Keep the aes-256-gcm format and the existing decrypt path backward-compatible. Do NOT switch sha256 to scrypt/HKDF unless you also ship a migration for existing ciphertext. Run pnpm check after.
```

## 8. Two DB round-trips per authenticated request

**Where:** `src/lib/server/api-guards.ts` (`requireUserContext`)
**Problem:** Calls `getSession` (DB) then `getUserModerationDetails` (DB) on every non-admin API request.

**Paste block:**
```
src/lib/server/api-guards.ts runs getUserModerationDetails (a separate DB query) on every non-admin API request, on top of getSession. Reduce to one round-trip: either store accountStatus/moderationReason as better-auth additionalFields on the user so they come back with getSession, or join moderation into the session lookup. Preserve the current 403 behavior for non-active accounts and the admin bypass. Run pnpm check and pnpm build after.
```

---

# LOW — cleanup (safe, batchable into one task)

**Paste block:**
```
In money-diary, remove dead code (verify no imports first with grep, then delete):
1. src/db.ts — getClient()/neon client is imported nowhere; delete the file.
2. src/db-collections/index.ts — messagesCollection/MessageSchema is leftover template code, imported nowhere; delete the file (and the directory if it becomes empty).
3. src/features/auth/server/user-security-repository.ts — the @deprecated getSecurityProfileForUser export: remove it if it has no remaining callers.
Run pnpm check and pnpm build after to confirm nothing broke.
```

---

# Notes (no action required)

- **AI prompt-injection regexes** in `src/features/ai/server/ai-security.ts` are bypassable, but the real protection is server-side userId-scoped tool execution. Fine as defense-in-depth; don't rely on the regex alone.
- **same-origin check** (`src/lib/server/same-origin.ts`): requests with no `Origin` header bypass the check. Acceptable for non-browser clients; ensure better-auth cookies are `SameSite`.
- **Docstring noise:** nearly every trivial function carries a `/** one-liner */`. Not a bug, just verbose — optional style pass only.

# Account Recovery and User Data Encryption

## Requirement

### Problem
Users need a way to recover access when they forget their password, without relying on email OTP in the early product phase. The platform also needs a path toward optional per-user data encryption later.

### User Story
As a user, I want to set recovery details when I create my account so I can reset my password by proving I know private answers only I would know.

### Scope
- In scope (Phase 1 — implemented):
  - Required recovery email (stored, not OTP-verified yet)
  - One predefined security question with hashed answer
  - Sign-up redirects to `/setup-security` for recovery profile
  - Settings page to create/update recovery profile (password required for updates)
  - Forgot-password flow using security questions only
  - Stricter rate limiting on recovery endpoints
- In scope (Phase 2 — backlog):
  - Recovery email OTP verification
  - Optional email reset link after OTP
  - Admin tooling for account recovery edge cases
- Out of scope for now:
  - SMS OTP
  - Per-user ledger field encryption (see Future Backlog)

## Phases

### Phase 1 — Security questions (current)
1. User signs up with email/password plus recovery profile.
2. Answers are normalized (trim, lowercase) and hashed with Better Auth password hashing.
3. Forgot password:
   - `POST /api/auth/recovery/challenge` with email → returns question labels if profile exists
   - `POST /api/auth/recovery/reset` with email, security answer, new password
4. Existing users without a profile are redirected to `/setup-security` until complete.

### Phase 2 — OTP on recovery email (backlog)
- Verify `recovery_email` before trusting it for notifications.
- Add OTP challenge before password reset or as an alternative to security questions.
- Mark `recovery_email_verified = true` after successful OTP.

### Phase 3 — Recovery email reset link (backlog)
- Send time-limited reset link to verified recovery email.
- Keep security questions as fallback.

## Future Backlog — Per-user data encryption

> **Status: NOT IMPLEMENTED — future work**

Goal: encrypt sensitive user ledger fields so server operators cannot read them without the user's secrets.

Planned approach:
- Derive a user master key with KDF(password + normalized security answers).
- Encrypt selected columns (notes, titles, amounts TBD) client-side or via envelope encryption server-side.
- On password reset via security questions, re-wrap keys after successful verification.
- OTP-verified recovery email becomes required before destructive key rotation.

**Important:** Category slugs, global settings, and built-in taxonomy are **not** user secrets and must not be used as encryption key material.

## Data Model

Table: `user_security_profile`

| Column | Purpose |
|--------|---------|
| `user_id` | PK, FK to `user` |
| `recovery_email` | Required backup email |
| `recovery_email_verified` | `false` until Phase 2 OTP |
| `question_one_key` | Predefined question slug |
| `answer_one_hash` | Hashed answer |

## API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/auth/security-profile` | Session | Read recovery profile (no answer hashes) |
| POST | `/api/auth/security-profile` | Session | Create profile |
| PATCH | `/api/auth/security-profile` | Session + current password | Update profile |
| POST | `/api/auth/recovery/challenge` | Public | Load questions for email |
| POST | `/api/auth/recovery/reset` | Public | Reset password with answers |

## UX Routes

- `/sign-up` — account only (step 1)
- `/setup-security` — required recovery email + security question (step 2)
- `/forgot-password` — challenge + reset
- `/settings` — manage recovery profile

## Security Notes

- Recovery endpoints use dedicated rate limiting (10 attempts / hour / IP / route).
- Reset failures return a generic error message.
- Security answers are never stored in plaintext.
- Recovery email is stored for future OTP only; it is not verified in Phase 1.

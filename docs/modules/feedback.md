# Feedback module

> Read before editing `src/features/feedback/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

Support tickets with threaded messages. Users open tickets; admins respond.

## File tree

```text
feedback/
  api/tickets-api.ts
  schemas/ticket.ts
  hooks/use-tickets.ts
  server/tickets-repository.ts
  components/feedback-form-section.tsx     # user: open ticket
  components/user-tickets-section.tsx      # user: list own tickets
  components/ticket-detail-sheet.tsx
  components/ticket-thread.tsx
  components/admin-tickets-section.tsx     # admin view
  types/ticket.ts
```

## Data model

- `tickets` (`userId · type · subject · body · status(def open)`)
- `ticket_messages` (`ticketId · authorUserId · authorRole · body`)

## Routes

- API: `/api/tickets`, `/api/tickets/$id`, `/api/tickets/$id/messages`
- Admin: `/api/admin/tickets(/$id, /$id/messages)`

## Rules & gotchas

- Users see only their own tickets (ownership scope); admins see all via admin-gated routes.
- `authorRole` distinguishes user vs admin messages in a thread — set server-side from the
  authenticated session, never trust client.
- Query keys: `queryKeys.tickets.*` (user), `queryKeys.admin.tickets/ticket` (admin).

## Cross-module deps

- **admin**: admin ticket views share the same tables.
- **auth**: author identity from session.

# AI module

> Read before editing `src/features/ai/`.
> Global: [AGENTS.md](../../AGENTS.md) · **Full internals: [ai-agent-reference.md](../ai-agent-reference.md)** · Semantics: [domain-knowledge.md](../domain-knowledge.md)

## Purpose

Natural-language finance assistant. User types actions ("spent 500 on groceries"), the AI
calls tools to create/update/delete transactions, savings, goals, wishlist items.

## File tree

```text
ai/
  hooks/use-ai-chat.ts · use-ai-conversations.ts · use-ai-transaction.ts
  schemas/ai-conversation.ts
  store/active-ai-conversation-store.ts
  server/                              # SERVER-ONLY orchestration
    ai-chat-service.ts                 # entry: runAiChat
    ai-prompt-builder.ts               # buildSecureSystemPrompt (task/transfer/savings rules)
    ai-history-window.ts               # last-N messages, SQL-bounded
    ai-tools.ts                        # OpenAI-style tool definitions
    ai-tool-executor.ts                # Zod parse + DB writes per tool
    ai-tool-fallback.ts
    ai-user-data-query.ts              # query_user_data (capped rows + totals)
    ai-security.ts                     # auth/ownership/limits
    ai-conversations-repository.ts
    format-ai-provider-error.ts
    openrouter-client.ts · gemini-client.ts · ollama-client.ts
    resolve-ai-provider.ts             # (admin) global-vs-user provider
  utils/ai-bulk-paste.ts · ai-navigation.ts · ai-progress-message.ts · product-knowledge.ts
  types/ai-conversation.ts
```

## Data model

- `ai_conversations` (`userId · title · isClosed`) and `ai_messages`
  (`conversationId · role · content · metadata`).
- Provider config lives in `ai_provider_settings` (see [settings.md](settings.md) / [admin.md](admin.md)).

## Flow

```text
POST /api/ai/chat → runAiChat → buildSecureSystemPrompt
  → getAiConversationModelMessages (SQL-limited) → provider client
  → tool calls → executeAiTool (Zod + DB write)
```

## Routes

- `/api/ai/chat`, `/api/ai/conversations`, `/api/ai/conversations/$conversationId`,
  `/api/ai/transaction`

## Rules & gotchas

- **Behavior must match product semantics** — expense vs transfer vs savings withdrawal.
  Source of truth is `buildSecureSystemPrompt()`; narrative in domain doc. If you change
  product rules, update the prompt too (see memory: keep AI assistant in sync).
- **Security**: session-authenticated only, Zod-validate every tool arg, ownership-check
  all referenced IDs, execute server-side only. Never trust model-supplied IDs.
- **Duplicate detection** on `create_transaction`: server skips title+amount+type+day
  matches, returns `duplicate: true`.
- **Bulk paste**: 4+ line pastes raise char limit (10k) and widen tool rounds/output for
  that turn only; one transfer clarification covers the whole paste.
- **Cost**: legal docs not embedded in prompt; history SQL-bounded;
  `query_user_data` truncates lists with aggregate totals — never guess totals.

## Cross-module deps

- Writes into **transactions, savings, goals, wishlist** via tool executor.
- **settings / admin**: provider resolution (user vs global).
- **exchange-rates**: `get_exchange_rate` tool when enabled for offline/local models.

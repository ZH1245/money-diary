import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import { useAiChatMutation } from '#/features/ai/hooks/use-ai-chat'
import {
  activeAiConversationStore,
  setActiveAiConversationId,
} from '#/features/ai/store/active-ai-conversation-store'
import {
  useAiConversationQuery,
  useAiConversationsQuery,
  useDeleteAiConversationMutation,
} from '#/features/ai/hooks/use-ai-conversations'
import type { AiConversationDetail, AiConversationMessage } from '#/features/ai/types/ai-conversation'
import { toolbarIconButtonClass } from '#/components/layout/toolbar-control-styles'
import { AlertTriangle, CheckCircle2, History, MessageSquarePlus, Sparkles, Trash2 } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import { useNavigate, Link } from '@tanstack/react-router'
import { queryKeys } from '#/features/query-keys'
import { formatAiProviderError } from '#/features/ai/server/format-ai-provider-error'
import { toast } from 'sonner'

interface ThreadMessage {
  id?: number
  role: 'user' | 'assistant'
  text: string
  ok?: boolean
  isError?: boolean
  action?: string
  steps?: Array<{ action: string; success: boolean }>
}

interface AiTransactionPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACTION_LABELS: Record<string, string> = {
  create_transaction: 'Transaction',
  update_transaction: 'Transaction updated',
  create_saving: 'Saving',
  create_goal: 'Goal',
  create_wishlist_item: 'Wishlist item',
  update_wishlist_item: 'Wishlist updated',
  delete_wishlist_item: 'Wishlist removed',
  update_goal: 'Goal updated',
  delete_goal: 'Goal removed',
  get_exchange_rate: 'Exchange rate',
  query_user_data: 'Data query',
  chained: 'Multiple actions',
}

const EXAMPLES = [
  'Spent 2500 on groceries yesterday',
  'Got salary of 85000 today',
  'Saved 10000 toward my goal',
]

/**
 * Formats assistant text for display, including legacy raw provider errors.
 */
function formatThreadMessageText(content: string, isError?: boolean): string {
  if (
    isError ||
    /generativelanguage\.googleapis|help\.googleapis|Quota exceeded for metric|google\.rpc/i.test(content)
  ) {
    return formatAiProviderError(content)
  }
  return content
}

/**
 * Maps persisted conversation messages into renderable thread bubbles.
 */
function mapConversationMessage(message: AiConversationMessage): ThreadMessage {
  const isError = message.metadata?.action === 'provider_error'
  return {
    id: message.id,
    role: message.role,
    text: formatThreadMessageText(message.content, isError),
    ok: isError ? false : message.metadata?.ok,
    isError,
    action: message.metadata?.action,
    steps: message.metadata?.steps,
  }
}

/**
 * Side panel AI assistant with persisted conversations across navigation.
 */
export function AiTransactionPanel({ open, onOpenChange }: AiTransactionPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [pendingMessages, setPendingMessages] = useState<ThreadMessage[]>([])
  const activeConversationId = useStore(activeAiConversationStore, (state) => state.conversationId)
  const mutation = useAiChatMutation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const deleteConversationMutation = useDeleteAiConversationMutation()
  const conversationsQuery = useAiConversationsQuery(open)
  const conversationQuery = useAiConversationQuery(activeConversationId)
  const bottomRef = useRef<HTMLDivElement>(null)

  const persistedThread = useMemo(
    () => (conversationQuery.data?.messages ?? []).map(mapConversationMessage),
    [conversationQuery.data?.messages],
  )

  const thread =
    activeConversationId == null && pendingMessages.length > 0
      ? pendingMessages
      : persistedThread

  const chatClosed = conversationQuery.data?.isClosed ?? false
  const savedChats = conversationsQuery.data ?? []
  const historyLabel =
    activeConversationId == null
      ? pendingMessages.length > 0
        ? 'Sending...'
        : 'Start typing below'
      : conversationQuery.data?.title ?? 'Loading...'

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, thread, mutation.isPending])

  function handleNewChat() {
    setActiveAiConversationId(null)
    setPendingMessages([])
    setPrompt('')
  }

  function handleSelectConversation(conversationId: number) {
    setActiveAiConversationId(conversationId)
    setPrompt('')
  }

  async function handleDeleteConversation(conversationId: number) {
    try {
      await deleteConversationMutation.mutateAsync(conversationId)
      if (activeConversationId === conversationId) {
        const fallback = savedChats.find((entry) => entry.id !== conversationId)
        setActiveAiConversationId(fallback?.id ?? null)
      }
      toast.success('Chat deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete chat')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (chatClosed) return

    const text = prompt.trim()
    if (!text) return

    setPrompt('')

    if (activeConversationId == null) {
      setPendingMessages((current) => [...current, { role: 'user', text }])
    } else {
      queryClient.setQueryData<AiConversationDetail | undefined>(
        queryKeys.ai.conversation(activeConversationId),
        (current) => {
          if (!current) return current
          return {
            ...current,
            messages: [
              ...current.messages,
              {
                id: -Date.now(),
                role: 'user' as const,
                content: text,
                metadata: null,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        },
      )
    }

    try {
      const result = await mutation.mutateAsync({
        conversationId: activeConversationId ?? undefined,
        message: text,
      })

      setPendingMessages([])

      if (result.conversationId) {
        queryClient.setQueryData<AiConversationDetail>(
          queryKeys.ai.conversation(result.conversationId),
          (current) => {
            const title = text.trim().slice(0, 80) || 'New chat'
            const userMessage = {
              id: -Date.now(),
              role: 'user' as const,
              content: text,
              metadata: null,
              createdAt: new Date().toISOString(),
            }
            const assistantText = result.message ?? result.error
            const assistantMessage =
              assistantText != null
                ? {
                    id: -(Date.now() + 1),
                    role: 'assistant' as const,
                    content: assistantText,
                    metadata: {
                      action: result.action === 'provider_error' ? 'provider_error' : result.action,
                      ok:
                        result.action !== 'provider_error' &&
                        result.action !== 'clarification' &&
                        (result.steps?.length
                          ? result.steps.every((step) => step.success)
                          : result.success),
                      steps: result.steps?.map((step) => ({
                        action: step.action,
                        success: step.success,
                      })),
                    },
                    createdAt: new Date().toISOString(),
                  }
                : null

            if (!current) {
              return {
                id: result.conversationId!,
                title,
                isClosed: Boolean(result.closeChat),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: assistantMessage ? [userMessage, assistantMessage] : [userMessage],
              }
            }

            return {
              ...current,
              title: current.title === 'New chat' ? title : current.title,
              messages: assistantMessage
                ? [...current.messages, assistantMessage]
                : current.messages,
            }
          },
        )
      }

      if (result.closeChat) {
        toast.error('AI chat closed for security reasons.')
        return
      }

      if (!result.success && result.error) {
        toast.error(result.error)
        return
      }

      if (result.warning) {
        toast.warning(result.warning)
      }

      if (result.action === 'clarification') {
        return
      }

      if (result.steps?.length) {
        const allOk = result.steps.every((step) => step.success)
        if (allOk) {
          const label =
            result.action === 'chained'
              ? `${result.steps.length} entries created`
              : ACTION_LABELS[result.action ?? ''] ?? 'Entry created'
          toast.success(label)
        } else {
          toast.error('Some actions could not be completed.')
        }
        if (allOk && result.navigateTo) {
          void navigate({ to: result.navigateTo })
        }
        return
      }

      if (result.success && result.message && result.action && result.action !== 'chained') {
        toast.success(ACTION_LABELS[result.action] ?? 'Entry created')
        if (result.navigateTo) {
          void navigate({ to: result.navigateTo })
        }
      }
    } catch (error) {
      setPendingMessages([])
      const message = error instanceof Error ? error.message : 'Request failed.'
      toast.error(message)
    }
  }

  function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  function handleExampleClick(example: string) {
    setPrompt(example)
  }

  const isLoadingConversation = activeConversationId != null && conversationQuery.isLoading
  const showEmptyState =
    !isLoadingConversation && thread.length === 0 && !chatClosed && pendingMessages.length === 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="space-y-0 border-b px-4 py-3 pr-12">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            AI Assistant
          </SheetTitle>

          <div className="mt-2.5 flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-0 flex-1 justify-start gap-2 px-4 py-2 font-normal"
                >
                  <History className="size-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{historyLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[min(20rem,calc(100vw-2rem))]">
                <DropdownMenuLabel>Saved chats</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleNewChat}>
                  <MessageSquarePlus className="size-4" />
                  <span>New chat</span>
                </DropdownMenuItem>
                {savedChats.length > 0 ? <DropdownMenuSeparator /> : null}
                {savedChats.length === 0 ? (
                  <DropdownMenuItem disabled>No saved chats yet</DropdownMenuItem>
                ) : (
                  savedChats.map((conversation) => (
                    <DropdownMenuItem
                      key={conversation.id}
                      className="flex items-center justify-between gap-2"
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <span className="truncate">{conversation.title}</span>
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label={`Delete ${conversation.title}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDeleteConversation(conversation.id)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              className={toolbarIconButtonClass}
              onClick={handleNewChat}
              aria-label="New chat"
              title="New chat"
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {chatClosed ? (
            <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>Chat closed after repeated unsafe requests. Start a new chat to continue.</p>
            </div>
          ) : null}

          {isLoadingConversation ? (
            <div className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground animate-pulse">
              Loading chat...
            </div>
          ) : null}

          {showEmptyState ? (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">
                Log transactions, savings, goals, or wishlist items. You can also ask about our{' '}
                <Link to="/privacy" className="underline underline-offset-2" onClick={() => onOpenChange(false)}>
                  Privacy Policy
                </Link>{' '}
                or{' '}
                <Link to="/terms" className="underline underline-offset-2" onClick={() => onOpenChange(false)}>
                  Terms
                </Link>
                .
              </p>
              <div className="space-y-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    className="w-full text-left text-sm rounded-lg border border-border bg-muted/30 px-3 py-2.5 hover:bg-muted/60 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {thread.map((message, index) => (
            <div
              key={message.id ?? index}
              className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && message.isError ? (
                <AlertTriangle className="mt-1 size-4 shrink-0 text-destructive" />
              ) : message.role === 'assistant' && message.ok ? (
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
              ) : null}
              <div
                className={`rounded-xl px-3 py-2 text-sm max-w-[84%] whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : message.isError
                      ? 'border border-destructive/30 bg-destructive/10 text-destructive'
                      : message.ok
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800'
                        : 'bg-muted text-foreground'
                }`}
              >
                {message.text}
                {message.steps?.length ? (
                  <div className="mt-2 space-y-1 border-t border-emerald-200/60 pt-2 dark:border-emerald-800/60">
                    {message.steps.map((step, stepIndex) => (
                      <span
                        key={stepIndex}
                        className="block text-[10px] font-medium uppercase tracking-wide opacity-70"
                      >
                        {step.success ? '✓' : '✗'} {ACTION_LABELS[step.action] ?? step.action}
                      </span>
                    ))}
                  </div>
                ) : message.ok && message.action ? (
                  <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide opacity-60">
                    {ACTION_LABELS[message.action] ?? message.action}
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {mutation.isPending ? (
            <div className="flex justify-start">
              <div className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground animate-pulse">
                Thinking...
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t px-4 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder={chatClosed ? 'Chat closed' : 'Ask about your finances...'}
              disabled={chatClosed || mutation.isPending || isLoadingConversation}
              className="min-h-[44px] max-h-32 flex-1 resize-none"
              rows={2}
            />
            <Button
              type="submit"
              disabled={chatClosed || mutation.isPending || isLoadingConversation || !prompt.trim()}
              className="shrink-0"
            >
              Send
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Shift+Enter for a new line · Enter to send
          </p>
          <p className="text-[11px] text-muted-foreground">
            <Link to="/privacy" className="underline underline-offset-2" onClick={() => onOpenChange(false)}>
              Privacy Policy
            </Link>
            {' · '}
            <Link to="/terms" className="underline underline-offset-2" onClick={() => onOpenChange(false)}>
              Terms of Service
            </Link>
          </p>
        </form>
      </SheetContent>
    </Sheet>
  )
}

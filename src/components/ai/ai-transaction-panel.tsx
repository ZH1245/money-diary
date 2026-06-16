import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import { type AiChatMessage, useAiChatMutation } from '#/features/ai/hooks/use-ai-chat'
import { CheckCircle2, Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import { useRef, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface ThreadMessage {
  role: 'user' | 'assistant'
  text: string
  ok?: boolean
  action?: string
}

interface AiTransactionPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACTION_LABELS: Record<string, string> = {
  create_transaction: 'Transaction',
  create_saving: 'Saving',
  create_goal: 'Goal',
  create_wishlist_item: 'Wishlist item',
}

const EXAMPLES = [
  'Spent 2500 on groceries yesterday from Cash on hand',
  'Got salary of 85000 today',
  'Saved 10000 toward Hajj goal from HBL',
  'Add iPhone 16 Pro to wishlist, target 350000',
  'New goal: Emergency fund, 500000 target by Dec 2026',
]

/**
 * Side panel AI assistant that handles transactions, savings, goals and wishlist
 * via plain language — all writes are session-gated on the server.
 */
export function AiTransactionPanel({ open, onOpenChange }: AiTransactionPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const mutation = useAiChatMutation()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when thread grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, mutation.isPending])

  function buildApiMessages(): AiChatMessage[] {
    return thread.map((m) => ({
      role: m.role,
      content: m.text,
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = prompt.trim()
    if (!text) return

    setPrompt('')
    setThread((prev) => [...prev, { role: 'user', text }])

    const history = buildApiMessages()

    try {
      const result = await mutation.mutateAsync([...history, { role: 'user', content: text }])

      if (result.action === 'clarification') {
        setThread((prev) => [
          ...prev,
          { role: 'assistant', text: result.message ?? 'Could you clarify?', ok: false },
        ])
        return
      }

      if (result.success && result.message) {
        setThread((prev) => [
          ...prev,
          { role: 'assistant', text: result.message ?? '', ok: true, action: result.action },
        ])
        toast.success(ACTION_LABELS[result.action ?? ''] ?? 'Entry' + ' created')
      } else {
        setThread((prev) => [
          ...prev,
          { role: 'assistant', text: result.error ?? 'Something went wrong.', ok: false },
        ])
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.'
      setThread((prev) => [...prev, { role: 'assistant', text: message, ok: false }])
    }
  }

  function handleExampleClick(example: string) {
    setPrompt(example)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI Assistant
          </SheetTitle>
          <SheetDescription>
            Describe a transaction, saving, goal, or wishlist item in plain language.
          </SheetDescription>
        </SheetHeader>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {thread.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mt-6">
                Try one of these or type your own:
              </p>
              <div className="space-y-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    className="w-full text-left text-sm rounded-lg border border-border bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {thread.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && message.ok ? (
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
              ) : null}
              <div
                className={`rounded-xl px-3 py-2 text-sm max-w-[84%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : message.ok
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-muted text-foreground'
                }`}
              >
                {message.text}
                {message.ok && message.action ? (
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

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 border-t px-4 py-3">
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Type anything about your finances..."
            disabled={mutation.isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={mutation.isPending || !prompt.trim()}>
            Send
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

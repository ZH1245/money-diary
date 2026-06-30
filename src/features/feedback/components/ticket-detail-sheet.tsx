import { Loader2, SendHorizonal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { InlineError } from '#/components/feedback/inline-error'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Textarea } from '#/components/ui/textarea'
import {
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  TicketStatusBadge,
  TicketThread,
} from '#/features/feedback/components/ticket-thread'
import {
  useAdminTicketDetailQuery,
  useCreateAdminTicketMessageMutation,
  useCreateUserTicketMessageMutation,
  useUpdateTicketStatusMutation,
  useUserTicketDetailQuery,
} from '#/features/feedback/hooks/use-tickets'
import type { TicketStatus } from '#/features/feedback/types/ticket'

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: TICKET_STATUS_LABELS.open },
  { value: 'in_progress', label: TICKET_STATUS_LABELS.in_progress },
  { value: 'resolved', label: TICKET_STATUS_LABELS.resolved },
  { value: 'closed', label: TICKET_STATUS_LABELS.closed },
]

interface TicketDetailSheetProps {
  mode: 'user' | 'admin'
  ticketId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Side panel showing full ticket details, conversation thread, and reply form. */
export function TicketDetailSheet({
  mode,
  ticketId,
  open,
  onOpenChange,
}: TicketDetailSheetProps) {
  const userQuery = useUserTicketDetailQuery(mode === 'user' ? ticketId : null)
  const adminQuery = useAdminTicketDetailQuery(mode === 'admin' ? ticketId : null)
  const ticketQuery = mode === 'admin' ? adminQuery : userQuery

  const replyMutationUser = useCreateUserTicketMessageMutation(ticketId ?? 0)
  const replyMutationAdmin = useCreateAdminTicketMessageMutation(ticketId ?? 0)
  const replyMutation = mode === 'admin' ? replyMutationAdmin : replyMutationUser
  const updateStatus = useUpdateTicketStatusMutation()

  const [replyBody, setReplyBody] = useState('')
  const [replyError, setReplyError] = useState<string | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const ticket = ticketQuery.data

  useEffect(() => {
    if (!open || !ticket) return
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, ticket?.messages.length, ticket])

  useEffect(() => {
    if (!open) {
      setReplyBody('')
      setReplyError(null)
    }
  }, [open, ticketId])

  const canReply =
    replyBody.trim().length > 0 &&
    ticketId != null &&
    ticket?.status !== 'closed'

  const handleReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canReply) return

    setReplyError(null)

    try {
      await replyMutation.mutateAsync({ body: replyBody.trim() })
      setReplyBody('')
      toast.success('Reply sent')
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Unable to send reply')
    }
  }

  const handleStatusChange = async (status: TicketStatus) => {
    if (!ticket || ticketId == null || status === ticket.status) return

    try {
      await updateStatus.mutateAsync({ id: ticketId, input: { status } })
      toast.success('Status updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update status')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4 pr-12 text-left">
          <SheetTitle className="line-clamp-2 text-base">
            {ticket?.subject ?? 'Ticket'}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-2 pt-1">
              {ticket ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-foreground">
                      {TICKET_TYPE_LABELS[ticket.type]}
                    </span>
                    <TicketStatusBadge status={ticket.status} />
                    <span className="text-muted-foreground">
                      Opened{' '}
                      {new Date(ticket.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  {mode === 'admin' && ticket.submitter ? (
                    <p className="text-xs text-muted-foreground">
                      From {ticket.submitter.name}
                    </p>
                  ) : null}
                  {mode === 'admin' ? (
                    <Select
                      value={ticket.status}
                      onValueChange={(value) =>
                        void handleStatusChange(value as TicketStatus)
                      }
                      disabled={updateStatus.isPending}
                    >
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Status: {TICKET_STATUS_LABELS[ticket.status]}
                    </p>
                  )}
                </>
              ) : (
                <span>Loading ticket details…</span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {ticketQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading conversation…
              </div>
            ) : ticketQuery.error ? (
              <InlineError
                message={
                  ticketQuery.error instanceof Error
                    ? ticketQuery.error.message
                    : 'Unable to load ticket'
                }
              />
            ) : ticket ? (
              <>
                <TicketThread ticket={ticket} viewerRole={mode} />
                <div ref={threadEndRef} />
              </>
            ) : null}
          </div>

          {ticket && ticket.status !== 'closed' ? (
            <form
              onSubmit={(e) => void handleReply(e)}
              className="border-t bg-background px-5 py-4"
            >
              <label htmlFor="ticket-reply" className="mb-1 block text-sm font-medium">
                {mode === 'admin' ? 'Reply to user' : 'Add a follow-up'}
              </label>
              <Textarea
                id="ticket-reply"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={
                  mode === 'admin'
                    ? 'Write your response…'
                    : 'Add more details or answer a question…'
                }
                rows={3}
                maxLength={2000}
                disabled={replyMutation.isPending}
              />
              {replyError ? (
                <div className="mt-2">
                  <InlineError message={replyError} />
                </div>
              ) : null}
              <Button
                type="submit"
                className="mt-3"
                disabled={!canReply || replyMutation.isPending}
              >
                {replyMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <SendHorizonal className="size-4" />
                )}
                Send reply
              </Button>
            </form>
          ) : ticket?.status === 'closed' ? (
            <div className="border-t bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
              {mode === 'admin'
                ? 'This ticket is closed. Change the status above to reply.'
                : 'This ticket is closed and cannot receive new replies.'}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

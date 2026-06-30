import { ChevronRight, Loader2, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { PageEmptyState } from '#/components/feedback/page-state'
import { TicketDetailSheet } from '#/features/feedback/components/ticket-detail-sheet'
import {
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  TicketStatusBadge,
} from '#/features/feedback/components/ticket-thread'
import { useUserTicketsQuery } from '#/features/feedback/hooks/use-tickets'

/** Lists the user's submitted tickets with a link to view the full thread. */
export function UserTicketsSection() {
  const { data: tickets = [], isLoading } = useUserTicketsQuery()
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleOpenTicket = (ticketId: number) => {
    setSelectedTicketId(ticketId)
    setSheetOpen(true)
  }

  return (
    <>
      <article className="md-panel p-5 md:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <MessagesSquare className="size-4 text-primary" />
          Your tickets
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          View status and continue the conversation on tickets you have submitted.
        </p>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading your tickets…
            </div>
          ) : tickets.length === 0 ? (
            <PageEmptyState message="No tickets yet. Submit feedback above to start a conversation." />
          ) : (
            <ul className="divide-y divide-border rounded-lg border">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => handleOpenTicket(ticket.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {ticket.subject}
                        </span>
                        <TicketStatusBadge status={ticket.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {TICKET_TYPE_LABELS[ticket.type]} ·{' '}
                        {TICKET_STATUS_LABELS[ticket.status]} · Updated{' '}
                        {new Date(ticket.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      <TicketDetailSheet
        mode="user"
        ticketId={selectedTicketId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}

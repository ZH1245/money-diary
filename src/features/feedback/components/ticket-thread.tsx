import type {
  TicketDetailDto,
  TicketMessageDto,
  TicketStatus,
  TicketType,
} from '#/features/feedback/types/ticket'
import { cn } from '#/lib/utils'

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  support: 'Support',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const TICKET_STATUS_STYLES: Record<TicketStatus, string> = {
  open: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  in_progress: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  resolved: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  closed: 'bg-muted text-muted-foreground',
}

interface TicketThreadItem {
  id: number | 'original'
  authorRole: 'user' | 'admin'
  body: string
  createdAt: string
  isOriginal?: boolean
}

/** Builds a chronological thread from the ticket body plus follow-up messages. */
export function buildTicketThread(
  ticket: Pick<TicketDetailDto, 'body' | 'createdAt' | 'userId' | 'messages'>,
): TicketThreadItem[] {
  const original: TicketThreadItem = {
    id: 'original',
    authorRole: 'user',
    body: ticket.body,
    createdAt: ticket.createdAt,
    isOriginal: true,
  }

  const replies: TicketThreadItem[] = ticket.messages.map(
    (message: TicketMessageDto) => ({
      id: message.id,
      authorRole: message.authorRole,
      body: message.body,
      createdAt: message.createdAt,
    }),
  )

  return [original, ...replies]
}

interface TicketStatusBadgeProps {
  status: TicketStatus
  className?: string
}

/** Small pill showing ticket workflow status. */
export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
        TICKET_STATUS_STYLES[status],
        className,
      )}
    >
      {TICKET_STATUS_LABELS[status]}
    </span>
  )
}

interface TicketThreadProps {
  ticket: Pick<TicketDetailDto, 'body' | 'createdAt' | 'userId' | 'messages'>
  viewerRole: 'user' | 'admin'
}

/** Renders the full ticket conversation including the original submission. */
export function TicketThread({ ticket, viewerRole }: TicketThreadProps) {
  const items = buildTicketThread(ticket)

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isMine =
          viewerRole === 'admin'
            ? item.authorRole === 'admin'
            : item.authorRole === 'user'

        const authorLabel =
          item.authorRole === 'admin'
            ? viewerRole === 'admin'
              ? 'ADMIN'
              : 'Support team'
            : viewerRole === 'user' && isMine
              ? 'You'
              : 'User'

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-sm',
              isMine
                ? 'ml-4 border-primary/20 bg-primary/5'
                : 'mr-4 border-border bg-muted/40',
            )}
          >
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{authorLabel}</span>
              {item.isOriginal ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  Original
                </span>
              ) : null}
              <span>
                {new Date(item.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words text-foreground">
              {item.body}
            </p>
          </div>
        )
      })}
    </div>
  )
}

import { Skeleton } from '#/components/ui/skeleton'

interface PageStateProps {
  message: string
}

/**
 * Full-page branded loader shown while the auth session is loading.
 */
export function SessionLoadingSkeleton() {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-8 backdrop-blur-sm">
        <div className="relative flex size-24 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
          <svg
            viewBox="0 0 120 120"
            className="size-20"
            role="img"
            aria-label="Money Diary loading"
          >
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeOpacity="0.2"
            />
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="180 100"
              className="origin-center animate-spin text-primary"
            />
            <path
              d="M38 73V50m22 23V42m22 31V57"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              className="text-primary/80"
            />
          </svg>
        </div>

        <div className="w-full space-y-1 text-center">
          <p className="text-sm font-medium">Loading your money diary...</p>
          <p className="text-xs opacity-70">Syncing your private workspace</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton grid for stat summary cards.
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for sortable data tables.
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-64 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b bg-muted/40 px-3 py-3">
          <div className="flex gap-6">
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-6 border-b px-3 py-3 last:border-b-0">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full max-w-[9rem]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for feature pages with optional stats and a table.
 */
export function PageContentSkeleton({
  showStats = false,
  statCount = 4,
  tableRows = 5,
  tableColumns = 4,
}: {
  showStats?: boolean
  statCount?: number
  tableRows?: number
  tableColumns?: number
}) {
  return (
    <div className="space-y-5">
      {showStats ? <StatCardsSkeleton count={statCount} /> : null}
      <TableSkeleton rows={tableRows} columns={tableColumns} />
    </div>
  )
}

/**
 * Skeleton for the dashboard home view.
 */
export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <StatCardsSkeleton count={8} />
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-[22rem] rounded-2xl xl:h-[28rem]" />
        <Skeleton className="h-[22rem] rounded-2xl xl:h-[28rem]" />
      </div>
      <div className="space-y-3 rounded-2xl border border-border p-5">
        <Skeleton className="h-4 w-40" />
        <TableSkeleton rows={5} columns={4} />
      </div>
    </div>
  )
}

/**
 * Skeleton for the analytics page body.
 */
export function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <StatCardsSkeleton count={4} />
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}

/**
 * @deprecated Use SessionLoadingSkeleton or PageContentSkeleton instead.
 */
export function PageLoadingState(_props: PageStateProps) {
  return <PageContentSkeleton />
}

/**
 * Shared error placeholder for authenticated pages.
 */
export function PageErrorState({ message }: PageStateProps) {
  return <p className="p-6 text-sm text-red-600 md:p-8">{message}</p>
}

/**
 * Shared empty placeholder for list sections.
 */
export function PageEmptyState({ message }: PageStateProps) {
  return <p className="text-sm opacity-80">{message}</p>
}

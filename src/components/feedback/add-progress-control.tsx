/**
 * Renders a simple progress bar for current vs target amounts.
 */
export function ProgressBar({ current, target }: { current: number; target: number }) {
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0

  return (
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
    </div>
  )
}

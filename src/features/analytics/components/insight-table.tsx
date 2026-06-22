import { SensitiveText } from '#/components/privacy/sensitive-text'
import { formatSensitiveCurrency } from '#/lib/privacy/sensitive-format'
import type { AnalyticsInsightRow } from '#/features/analytics/utils/analytics-stats'

interface InsightTableProps {
  title: string
  rows: AnalyticsInsightRow[]
  currency: string
  colors: string[]
  isPrivacyMode: boolean
}

/** Ranked insight list with share bars for analytics breakdowns. */
export function InsightTable({ title, rows, currency, colors, isPrivacyMode }: InsightTableProps) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className="feature-card rounded-2xl border border-border p-5">
      <p className="text-sm font-semibold">{title}</p>
      {rows.length ? (
        <ul className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const share = total > 0 ? (row.amount / total) * 100 : 0
            const color = colors[index % colors.length]

            return (
              <li key={row.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <SensitiveText text={row.label} className="font-medium" />
                  <span className="shrink-0 font-medium">{formatSensitiveCurrency(row.amount, currency, isPrivacyMode)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color }} />
                  </div>
                  <span className="w-10 text-right text-xs opacity-70">{share.toFixed(0)}%</span>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm opacity-70">No data yet.</p>
      )}
    </div>
  )
}

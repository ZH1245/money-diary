import { SensitiveText } from '#/components/privacy/sensitive-text'

interface InsightMiniCardProps {
  icon: React.ReactNode
  label: string
  value: string
  isSensitive?: boolean
}

/** Compact stat tile used on the dashboard grid. */
export function InsightMiniCard({ icon, label, value, isSensitive = false }: InsightMiniCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="truncate text-[0.65rem] uppercase tracking-wide opacity-70 sm:text-xs">{label}</p>
      </div>
      <p className="mt-2 wrap-break-word text-lg font-semibold leading-tight sm:mt-3 sm:text-2xl lg:text-3xl">
        {isSensitive ? <SensitiveText text={value} /> : value}
      </p>
    </div>
  )
}

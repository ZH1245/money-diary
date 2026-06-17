import type { ReactNode } from 'react'
import { SensitiveText } from '#/components/privacy/sensitive-text'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  isSensitive?: boolean
}

/**
 * Compact stat card for feature page summaries.
 */
export function StatCard({ icon, label, value, hint, isSensitive = false }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none">
        {isSensitive ? <SensitiveText text={value} /> : value}
      </p>
      {hint ? <p className="mt-2 text-xs opacity-70">{hint}</p> : null}
    </div>
  )
}

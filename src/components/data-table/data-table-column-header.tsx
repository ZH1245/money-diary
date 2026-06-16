import { Button } from '#/components/ui/button'
import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

/**
 * Renders a sortable column header for TanStack Table.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 gap-1 px-2 ${className ?? ''}`}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      <span>{title}</span>
      {sorted === 'asc' ? <ArrowUp className="size-3.5" /> : null}
      {sorted === 'desc' ? <ArrowDown className="size-3.5" /> : null}
      {!sorted ? <ArrowUpDown className="size-3.5 opacity-50" /> : null}
    </Button>
  )
}

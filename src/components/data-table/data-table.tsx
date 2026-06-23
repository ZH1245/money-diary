import { DataTableColumnHeader } from '#/components/data-table/data-table-column-header'
import { PrivacyModeToggle } from '#/components/privacy/privacy-mode-toggle'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils.ts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState } from 'react'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  filterPlaceholder?: string
  emptyMessage?: string
  showToolbar?: boolean
  showPrivacyToggle?: boolean
  initialSorting?: SortingState
  maxBodyHeight?: number
  rowHeightEstimate?: number
  fillWidth?: boolean
}

/**
 * Reusable TanStack Table with sorting and global text filter.
 */
export function DataTable<TData>({
  columns,
  data,
  filterPlaceholder = 'Filter rows...',
  emptyMessage = 'No rows found.',
  showToolbar = true,
  showPrivacyToggle = false,
  initialSorting = [],
  maxBodyHeight = 460,
  rowHeightEstimate = 56,
  fillWidth = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  })

  const rows = table.getRowModel().rows
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => rowHeightEstimate,
    overscan: 8,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0

  if (!data.length) {
    return <p className="text-sm opacity-80">{emptyMessage}</p>
  }

  return (
    <div className="space-y-3">
      {showToolbar ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showPrivacyToggle ? <PrivacyModeToggle compact /> : null}
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={filterPlaceholder}
            className={fillWidth ? 'w-full' : 'max-w-sm w-full sm:w-auto'}
            aria-label="Filter table rows"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-border w-full">
        <div
          ref={scrollContainerRef}
          className={maxBodyHeight != null ? 'overflow-auto' : undefined}
          style={maxBodyHeight != null ? { maxHeight: `${maxBodyHeight}px` } : undefined}
        >
          <Table className={fillWidth ? 'w-full table-fixed' : 'min-w-[720px]'}>
            <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 z-10 bg-background px-3 shadow-[inset_0_-1px_0_var(--border)]"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                <>
                  {paddingTop > 0 ? (
                    <TableRow aria-hidden="true">
                      <TableCell colSpan={columns.length} className="p-0" style={{ height: paddingTop }} />
                    </TableRow>
                  ) : null}
                  {virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index]
                    return (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              'px-3 py-2 align-top whitespace-normal',
                              (cell.column.columnDef.meta as { cellClassName?: string } | undefined)?.cellClassName,
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                  {paddingBottom > 0 ? (
                    <TableRow aria-hidden="true">
                      <TableCell colSpan={columns.length} className="p-0" style={{ height: paddingBottom }} />
                    </TableRow>
                  ) : null}
                </>
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm opacity-70">
                  No rows match your filter.
                </TableCell>
              </TableRow>
            )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

export { DataTableColumnHeader }

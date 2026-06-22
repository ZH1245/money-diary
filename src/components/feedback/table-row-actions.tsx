import { DeleteRowButton } from '#/components/feedback/delete-row-button'
import { Button } from '#/components/ui/button'
import { Pencil } from 'lucide-react'

interface TableRowActionsProps {
  label: string
  onEdit: () => void
  onDelete: () => void
  isDeletePending?: boolean
  canDelete?: boolean
}

/**
 * Standard edit and delete controls for data table rows.
 */
export function TableRowActions({
  label,
  onEdit,
  onDelete,
  isDeletePending,
  canDelete = true,
}: TableRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`Edit ${label}`}
        onClick={onEdit}
      >
        <Pencil className="size-4" />
      </Button>
      {canDelete ? (
        <DeleteRowButton label={label} isPending={Boolean(isDeletePending)} onConfirm={onDelete} />
      ) : null}
    </div>
  )
}

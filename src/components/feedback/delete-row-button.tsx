import { Button } from '#/components/ui/button'
import { Trash2 } from 'lucide-react'

interface DeleteRowButtonProps {
  label: string
  isPending?: boolean
  onConfirm: () => void
}

/**
 * Compact delete action for finance tables.
 */
export function DeleteRowButton({ label, isPending, onConfirm }: DeleteRowButtonProps) {
  function handleClick() {
    if (!window.confirm(`Delete ${label}?`)) return
    onConfirm()
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-destructive"
      disabled={isPending}
      onClick={handleClick}
      aria-label={`Delete ${label}`}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}

import { Sparkles } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import type { ChangelogRelease } from '#/content/changelog'

interface UpdateAvailableDialogProps {
  open: boolean
  release: ChangelogRelease | null
  onRefresh: () => void
  onDismiss: () => void
}

/** Modal shown when a newer deploy is available than the loaded client bundle. */
export function UpdateAvailableDialog({
  open,
  release,
  onRefresh,
  onDismiss,
}: UpdateAvailableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Update available
          </DialogTitle>
          <DialogDescription>
            {release
              ? `Money Diary ${release.version} is ready. Refresh to get the latest fixes and features.`
              : 'A newer version of Money Diary is ready. Refresh to update.'}
          </DialogDescription>
        </DialogHeader>

        {release?.highlights.length ? (
          <div className="rounded-lg border border-border bg-panel px-4 py-3">
            <p className="text-sm font-medium text-foreground">{release.title}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {release.highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onDismiss}>
            Later
          </Button>
          <Button type="button" onClick={onRefresh}>
            Refresh now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

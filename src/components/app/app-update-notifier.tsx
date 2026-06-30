import { useAppUpdate } from '#/hooks/use-app-update'
import { UpdateAvailableDialog } from '#/components/app/update-available-dialog'

/** Mounts update detection and the refresh modal for production users. */
export function AppUpdateNotifier() {
  const { isOpen, latestRelease, handleDismiss, handleRefresh } = useAppUpdate()

  if (!import.meta.env.PROD) {
    return null
  }

  return (
    <UpdateAvailableDialog
      open={isOpen}
      release={latestRelease}
      onRefresh={handleRefresh}
      onDismiss={handleDismiss}
    />
  )
}

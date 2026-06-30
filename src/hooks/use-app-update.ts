import { useCallback, useEffect, useState } from 'react'
import type { ChangelogRelease } from '#/content/changelog'
import {
  APP_UPDATE_EVENT,
  CLIENT_BUILD_ID,
  getDismissedBuildId,
  setDismissedBuildId,
} from '#/lib/app-version'

interface AppMetaResponse {
  version: string
  buildId: string
  latestRelease: ChangelogRelease | null
}

const POLL_INTERVAL_MS = 5 * 60 * 1000

/**
 * Polls deploy metadata and listens for service-worker updates to detect new releases.
 */
export function useAppUpdate() {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingBuildId, setPendingBuildId] = useState<string | null>(null)
  const [latestRelease, setLatestRelease] = useState<ChangelogRelease | null>(null)

  const evaluateMeta = useCallback((meta: AppMetaResponse) => {
    if (meta.buildId === CLIENT_BUILD_ID) {
      return
    }
    if (getDismissedBuildId() === meta.buildId) {
      return
    }

    setPendingBuildId(meta.buildId)
    setLatestRelease(meta.latestRelease)
    setIsOpen(true)
  }, [])

  const checkForUpdate = useCallback(async () => {
    try {
      const response = await fetch('/api/app/meta', { method: 'GET' })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        data?: AppMetaResponse
      } | null

      if (!response.ok || !payload?.success || !payload.data) {
        return
      }

      evaluateMeta(payload.data)
    } catch {
      // Best-effort polling only.
    }
  }, [evaluateMeta])

  useEffect(() => {
    void checkForUpdate()

    const intervalId = window.setInterval(() => {
      void checkForUpdate()
    }, POLL_INTERVAL_MS)

    function handleServiceWorkerUpdate() {
      void checkForUpdate()
    }

    window.addEventListener(APP_UPDATE_EVENT, handleServiceWorkerUpdate)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener(APP_UPDATE_EVENT, handleServiceWorkerUpdate)
    }
  }, [checkForUpdate])

  function handleRefresh() {
    window.location.reload()
  }

  function handleDismiss() {
    if (pendingBuildId) {
      setDismissedBuildId(pendingBuildId)
    }
    setIsOpen(false)
  }

  return {
    isOpen,
    latestRelease,
    pendingBuildId,
    clientBuildId: CLIENT_BUILD_ID,
    handleRefresh,
    handleDismiss,
  }
}

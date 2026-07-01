/** Public app release version — keep in sync with src/content/changelog.ts. */
export const APP_VERSION = '0.1.6'

/** Build id baked into the client bundle at compile time. */
export const CLIENT_BUILD_ID = import.meta.env.VITE_APP_BUILD_ID ?? 'dev'

const DISMISSED_BUILD_ID_KEY = 'money-diary:dismissed-build-id'

/** Reads the build id the user dismissed an update prompt for. */
export function getDismissedBuildId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(DISMISSED_BUILD_ID_KEY)
}

/** Remembers that the user deferred updating to this deploy build. */
export function setDismissedBuildId(buildId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DISMISSED_BUILD_ID_KEY, buildId)
}

export const APP_UPDATE_EVENT = 'money-diary:update-available'

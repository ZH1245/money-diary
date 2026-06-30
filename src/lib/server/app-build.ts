import { APP_VERSION } from '#/lib/app-version'
import { CHANGELOG_RELEASES, getLatestChangelogRelease } from '#/content/changelog'

/** Deploy build id — changes on each production deploy (Vercel commit SHA). */
export function getServerBuildId(): string {
  const raw = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.APP_BUILD_ID ?? 'dev'
  return raw.slice(0, 10)
}

/** Public app metadata for clients and OpenAPI. */
export function getAppMeta() {
  const latest = getLatestChangelogRelease()
  return {
    version: APP_VERSION,
    buildId: getServerBuildId(),
    latestRelease: latest,
    releases: CHANGELOG_RELEASES,
  }
}

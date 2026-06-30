import { format, parseISO } from 'date-fns'
import { APP_VERSION, CLIENT_BUILD_ID } from '#/lib/app-version'
import { CHANGELOG_RELEASES } from '#/content/changelog'

/** Settings section showing app version, build id, and release history. */
export function AboutSection() {
  return (
    <article className="md-panel space-y-6 p-5 md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">About Money Diary</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Version info for this install and what changed in recent releases.
        </p>
      </div>

      <dl className="grid gap-3 rounded-lg border border-border bg-panel px-4 py-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">App version</dt>
          <dd className="mt-1 font-medium text-foreground">v{APP_VERSION}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">This build</dt>
          <dd className="mt-1 font-mono text-xs text-foreground">{CLIENT_BUILD_ID}</dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Changelog</h3>
        <ul className="mt-3 space-y-4">
          {CHANGELOG_RELEASES.map((release) => (
            <li
              key={release.version}
              className="rounded-lg border border-border px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  v{release.version} · {release.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(release.date), 'MMM d, yyyy')}
                </p>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {release.highlights.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

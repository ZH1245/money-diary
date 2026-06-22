import { privacyPolicySections, privacyPolicyUpdateLog } from '#/features/legal/content/privacy-policy'

/**
 * Renders the Money Diary privacy policy sections and dated update history.
 */
export function PrivacyPolicyContent() {
  return (
    <>
      {privacyPolicySections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
          <div className="mt-3 space-y-3">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets?.length ? (
              <ul className="list-disc space-y-2 pl-5">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ))}

      <section id="policy-update-history" className="scroll-mt-24">
        <h2 className="text-base font-semibold text-foreground">Policy update history</h2>
        <div className="mt-3 space-y-6">
          {privacyPolicyUpdateLog.map((entry) => (
            <article key={entry.date} className="rounded-lg border border-border/70 p-4">
              <p className="text-sm font-medium text-foreground">{entry.date}</p>
              <p className="mt-1 text-sm opacity-90">{entry.summary}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm opacity-90">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

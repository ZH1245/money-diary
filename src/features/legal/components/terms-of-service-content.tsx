import { termsSections } from '#/features/legal/content/terms-of-service'

/**
 * Renders the Money Diary terms of service sections.
 */
export function TermsOfServiceContent() {
  return (
    <>
      {termsSections.map((section) => (
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
    </>
  )
}

import type { LucideIcon } from 'lucide-react'

interface AuthFeatureItem {
  icon: LucideIcon
  title: string
  description: string
}

interface AuthFeaturePanelProps {
  kicker: string
  title: string
  description: string
  features: AuthFeatureItem[]
  tags?: string[]
  gradientDirection?: 'br' | 'tr'
}

/**
 * Renders the marketing side panel for sign-in and sign-up pages.
 */
export function AuthFeaturePanel({
  kicker,
  title,
  description,
  features,
  tags = [],
  gradientDirection = 'br',
}: AuthFeaturePanelProps) {
  const gradientClass =
    gradientDirection === 'tr'
      ? 'bg-linear-to-tr from-(--hero-b) via-transparent to-(--hero-a)'
      : 'bg-linear-to-br from-(--hero-a) via-transparent to-(--hero-b)'

  return (
    <>
      <div className={`absolute inset-0 ${gradientClass}`} />
      <div className="pointer-events-none absolute -left-28 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex h-full items-center p-10 xl:p-16 rise-in">
        <div className="mx-auto w-full max-w-2xl rounded-3xl border border-border/50 bg-background/20 p-8 backdrop-blur-sm xl:p-10">
          <p className="island-kicker">{kicker}</p>
          <h2 className="display-title mt-3 text-3xl leading-tight tracking-[-0.02em] xl:text-4xl">
            {title}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed opacity-80">{description}</p>

          {tags.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border/60 bg-background/30 px-3 py-1 text-xs opacity-85">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <ul className="mt-10 space-y-6 border-t border-border/50 pt-10">
            {features.map((feature) => (
              <li key={feature.title} className="flex gap-3">
                <feature.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="mt-1 text-sm leading-relaxed opacity-75">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

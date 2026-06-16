import type { AuthSplitLayoutProps } from '#/components/types/auth-layout'

/**
 * Renders a responsive auth layout with feature and form panels.
 */
export function AuthSplitLayout({
  featurePanel,
  formPanel,
  reverseOnDesktop = false,
}: AuthSplitLayoutProps) {
  if (reverseOnDesktop) {
    return (
      <main className="grid min-h-screen grid-cols-1 bg-(--bg-base) lg:grid-cols-12">
        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:col-span-5 lg:px-12">
          {formPanel}
        </section>
        <section className="relative hidden overflow-hidden border-l border-border/60 lg:col-span-7 lg:block">
          {featurePanel}
        </section>
      </main>
    )
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-(--bg-base) lg:grid-cols-12">
      <section className="relative hidden overflow-hidden border-r border-border/60 lg:col-span-7 lg:block">
        {featurePanel}
      </section>
      <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:col-span-5 lg:px-12">
        {formPanel}
      </section>
    </main>
  )
}

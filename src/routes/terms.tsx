import { LegalPageLayout } from '#/components/layout/legal-page-layout'
import { TermsOfServiceContent } from '#/features/legal/components/terms-of-service-content'
import { TERMS_LAST_UPDATED } from '#/features/legal/content/terms-of-service'
import { buildPublicPageHead, TERMS_SEO } from '#/lib/seo/public-seo'
import { authClient } from '#/lib/auth-client'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  head: () =>
    buildPublicPageHead({
      ...TERMS_SEO,
      path: '/terms',
    }),
  component: TermsPage,
})

function TermsPage() {
  const { data: session } = authClient.useSession()
  const isSignedIn = Boolean(session?.user)

  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated={TERMS_LAST_UPDATED}
      backTo={isSignedIn ? '/' : '/sign-in'}
      backLabel={isSignedIn ? 'Back to dashboard' : 'Back to sign in'}
    >
      <TermsOfServiceContent />
    </LegalPageLayout>
  )
}

import { LegalPageLayout } from '#/components/layout/legal-page-layout'
import { PrivacyPolicyContent } from '#/features/legal/components/privacy-policy-content'
import { PRIVACY_POLICY_LAST_UPDATED } from '#/features/legal/content/privacy-policy'
import { buildPublicPageHead, PRIVACY_SEO } from '#/lib/seo/public-seo'
import { authClient } from '#/lib/auth-client'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  head: () =>
    buildPublicPageHead({
      ...PRIVACY_SEO,
      path: '/privacy',
    }),
  component: PrivacyPage,
})

function PrivacyPage() {
  const { data: session } = authClient.useSession()
  const isSignedIn = Boolean(session?.user)

  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated={PRIVACY_POLICY_LAST_UPDATED}
      backTo={isSignedIn ? '/' : '/sign-in'}
      backLabel={isSignedIn ? 'Back to dashboard' : 'Back to sign in'}
    >
      <PrivacyPolicyContent />
    </LegalPageLayout>
  )
}

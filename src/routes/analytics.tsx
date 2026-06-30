import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedRoutePage } from '#/components/layout/authenticated-route-page'
import { AnalyticsPageContent } from '#/features/analytics/components/analytics-page-content'
import { createAuthenticatedRouteLoader } from '#/lib/authenticated-route'

export const Route = createFileRoute('/analytics')({
  loader: createAuthenticatedRouteLoader('analytics'),
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const loaderData = Route.useLoaderData()

  return (
    <AuthenticatedRoutePage loaderData={loaderData}>
      {({ userCurrency }) => (
        <AnalyticsPageContent userCurrency={userCurrency} />
      )}
    </AuthenticatedRoutePage>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedRoutePage } from '#/components/layout/authenticated-route-page'
import { DashboardPageContent } from '#/features/dashboard/components/dashboard-page-content'
import { createAuthenticatedRouteLoader } from '#/lib/authenticated-route'

export const Route = createFileRoute('/dashboard')({
  loader: createAuthenticatedRouteLoader('dashboard'),
  component: Dashboard,
})

function Dashboard() {
  const loaderData = Route.useLoaderData()

  return (
    <AuthenticatedRoutePage loaderData={loaderData}>
      {({ userCurrency }) => (
        <DashboardPageContent userCurrency={userCurrency} />
      )}
    </AuthenticatedRoutePage>
  )
}

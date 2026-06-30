import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedRoutePage } from '#/components/layout/authenticated-route-page'
import { GoalsPageContent } from '#/features/goals/components/goals-page-content'
import { createAuthenticatedRouteLoader } from '#/lib/authenticated-route'

export const Route = createFileRoute('/goals')({
  loader: createAuthenticatedRouteLoader('goals'),
  component: GoalsPage,
})

function GoalsPage() {
  const loaderData = Route.useLoaderData()

  return (
    <AuthenticatedRoutePage loaderData={loaderData}>
      {({ userCurrency }) => (
        <GoalsPageContent userCurrency={userCurrency} />
      )}
    </AuthenticatedRoutePage>
  )
}

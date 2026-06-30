import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedRoutePage } from '#/components/layout/authenticated-route-page'
import { SavingsPageContent } from '#/features/savings/components/savings-page-content'
import { createAuthenticatedRouteLoader } from '#/lib/authenticated-route'

export const Route = createFileRoute('/savings')({
  loader: createAuthenticatedRouteLoader('savings'),
  component: SavingsPage,
})

function SavingsPage() {
  const loaderData = Route.useLoaderData()

  return (
    <AuthenticatedRoutePage loaderData={loaderData}>
      {({ userCurrency }) => (
        <SavingsPageContent userCurrency={userCurrency} />
      )}
    </AuthenticatedRoutePage>
  )
}

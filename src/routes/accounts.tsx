import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedRoutePage } from '#/components/layout/authenticated-route-page'
import { PaymentAccountsPageContent } from '#/features/payment-accounts/components/payment-accounts-page-content'
import { createAuthenticatedRouteLoader } from '#/lib/authenticated-route'

export const Route = createFileRoute('/accounts')({
  loader: createAuthenticatedRouteLoader('accounts'),
  component: AccountsPage,
})

function AccountsPage() {
  const loaderData = Route.useLoaderData()

  return (
    <AuthenticatedRoutePage loaderData={loaderData}>
      {({ userCurrency }) => (
        <PaymentAccountsPageContent userCurrency={userCurrency} />
      )}
    </AuthenticatedRoutePage>
  )
}

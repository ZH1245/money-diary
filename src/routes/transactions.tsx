import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedRoutePage } from '#/components/layout/authenticated-route-page'
import { TransactionsPageContent } from '#/features/transactions/components/transactions-page-content'
import { createAuthenticatedRouteLoader } from '#/lib/authenticated-route'

export const Route = createFileRoute('/transactions')({
  loader: createAuthenticatedRouteLoader('transactions'),
  component: TransactionsPage,
})

function TransactionsPage() {
  const loaderData = Route.useLoaderData()

  return (
    <AuthenticatedRoutePage loaderData={loaderData}>
      {({ userCurrency }) => (
        <TransactionsPageContent userCurrency={userCurrency} />
      )}
    </AuthenticatedRoutePage>
  )
}

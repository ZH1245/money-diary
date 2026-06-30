import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedRoutePage } from '#/components/layout/authenticated-route-page'
import { WishlistPageContent } from '#/features/wishlist/components/wishlist-page-content'
import { createAuthenticatedRouteLoader } from '#/lib/authenticated-route'

export const Route = createFileRoute('/wishlist')({
  loader: createAuthenticatedRouteLoader('wishlist'),
  component: WishlistPage,
})

function WishlistPage() {
  const loaderData = Route.useLoaderData()

  return (
    <AuthenticatedRoutePage loaderData={loaderData}>
      {({ userCurrency }) => (
        <WishlistPageContent userCurrency={userCurrency} />
      )}
    </AuthenticatedRoutePage>
  )
}

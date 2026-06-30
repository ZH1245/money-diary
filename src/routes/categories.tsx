import { createFileRoute } from '@tanstack/react-router'
import { AuthenticatedRoutePage } from '#/components/layout/authenticated-route-page'
import { CategoriesPageContent } from '#/features/categories/components/categories-page-content'
import { createAuthenticatedRouteLoader } from '#/lib/authenticated-route'

export const Route = createFileRoute('/categories')({
  loader: createAuthenticatedRouteLoader('categories'),
  component: CategoriesPage,
})

function CategoriesPage() {
  const loaderData = Route.useLoaderData()

  return (
    <AuthenticatedRoutePage loaderData={loaderData}>
      {({ userId }) => <CategoriesPageContent userId={userId} />}
    </AuthenticatedRoutePage>
  )
}

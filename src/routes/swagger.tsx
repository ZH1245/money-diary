import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { useAuthSession } from '#/lib/use-auth-session'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/swagger')({
  component: SwaggerPage,
})

function SwaggerPage() {
  const { data: session, isInitialPending } = useAuthSession()

  if (isInitialPending) {
    return <SessionLoadingSkeleton />
  }

  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user || role !== AUTH_ROLES.admin) {
    return (
      <main className="page-wrap py-6">
        <section className="island-shell rounded-2xl p-4 md:p-6">
          <h1 className="display-title mb-2 text-xl md:text-2xl">Forbidden</h1>
          <p className="text-sm opacity-80">Admin access is required to view API docs.</p>
        </section>
      </main>
    )
  }

  return (
    <AuthenticatedAppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role,
        currency: (session.user as { currency?: string }).currency,
      }}
    >
      <main className="p-6 md:p-8">
        <section className="island-shell rounded-2xl p-4 md:p-6">
          <h1 className="display-title mb-3 text-2xl md:text-3xl">API Docs</h1>
          <p className="mb-5 text-sm opacity-80">
            OpenAPI spec is served from <code>/api/openapi/json</code>. Your personal data routes work
            the same as for any other user.
          </p>
          <SwaggerUi />
        </section>
      </main>
    </AuthenticatedAppShell>
  )
}

/** Loads Swagger UI into the page after the admin shell is rendered. */
function SwaggerUi() {
  useEffect(() => {
    if (document.getElementById('swagger-ui-css')) return

    const styleTag = document.createElement('link')
    styleTag.id = 'swagger-ui-css'
    styleTag.rel = 'stylesheet'
    styleTag.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css'

    const scriptTag = document.createElement('script')
    scriptTag.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js'
    scriptTag.async = true
    scriptTag.onload = () => {
      const swaggerWindow = window as Window & {
        SwaggerUIBundle?: (config: Record<string, unknown>) => unknown
      }

      if (!swaggerWindow.SwaggerUIBundle) return

      swaggerWindow.SwaggerUIBundle({
        url: '/api/openapi/json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        defaultModelsExpandDepth: 1,
      })
    }

    document.head.appendChild(styleTag)
    document.body.appendChild(scriptTag)

    return () => {
      scriptTag.remove()
    }
  }, [])

  return <div id="swagger-ui" />
}

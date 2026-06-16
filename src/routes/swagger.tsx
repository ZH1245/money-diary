import { PageContentSkeleton } from '#/components/feedback/page-state'
import { authClient } from '#/lib/auth-client'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/swagger')({
  component: SwaggerPage,
})

function SwaggerPage() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <main className="page-wrap py-6">
        <section className="island-shell rounded-2xl p-4 md:p-6">
          <PageContentSkeleton tableRows={8} tableColumns={3} />
        </section>
      </main>
    )
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

  return (
    <main className="page-wrap py-6">
      <section className="island-shell rounded-2xl p-4 md:p-6">
        <h1 className="display-title mb-3 text-2xl md:text-3xl">API Docs</h1>
        <p className="mb-5 text-sm opacity-80">
          OpenAPI spec is served from <code>/api/openapi/json</code>.
        </p>
        <div id="swagger-ui" />
      </section>
    </main>
  )
}

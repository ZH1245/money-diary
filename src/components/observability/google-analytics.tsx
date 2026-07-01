import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import {
  getGaMeasurementId,
  isGoogleAnalyticsEnabled,
  trackGoogleAnalyticsPageView,
} from '#/lib/analytics/google-analytics'

/** Injects gtag.js when Google Analytics is enabled. */
export function GoogleAnalyticsScripts() {
  const measurementId = getGaMeasurementId()
  if (!measurementId || !isGoogleAnalyticsEnabled()) {
    return null
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}');
          `,
        }}
      />
    </>
  )
}

/** Reports TanStack Router navigations as GA4 page views. */
export function GoogleAnalyticsRouteReporter() {
  const pathname = useRouterState({
    // TanStack Router stores parsed search params as an object, not a query string.
    select: (state) => state.location.pathname,
  })

  useEffect(() => {
    trackGoogleAnalyticsPageView(pathname)
  }, [pathname])

  return null
}

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
  const pagePath = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.search}`,
  })

  useEffect(() => {
    trackGoogleAnalyticsPageView(pagePath)
  }, [pagePath])

  return null
}

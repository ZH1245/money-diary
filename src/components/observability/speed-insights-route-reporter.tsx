import { useRouterState } from '@tanstack/react-router'
import { SpeedInsights } from '@vercel/speed-insights/react'

/** Reports the active TanStack Router path to Vercel Speed Insights (fixes "Unknown" routes). */
export function SpeedInsightsRouteReporter() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return <SpeedInsights route={pathname} />
}

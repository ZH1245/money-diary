import { QueryClient } from '@tanstack/react-query'

/** Default stale window for prefetched loader data (TanStack Query SSR guidance). */
const PREFETCH_STALE_TIME_MS = 60_000

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: PREFETCH_STALE_TIME_MS,
      },
    },
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}

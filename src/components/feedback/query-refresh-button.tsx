import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface QueryRefreshButtonProps {
  className?: string
}

/**
 * Invalidates active TanStack Query caches and refetches server data.
 */
export function QueryRefreshButton({ className }: QueryRefreshButtonProps) {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function handleRefresh() {
    if (isRefreshing) return

    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries()
      await queryClient.refetchQueries({ type: 'active' })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => void handleRefresh()}
      disabled={isRefreshing}
      aria-label="Refresh data"
      title="Refresh data"
    >
      <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
    </Button>
  )
}

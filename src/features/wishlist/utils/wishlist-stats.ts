import { parseLedgerAmount } from '#/features/shared/utils/amount'

export interface WishlistPageStats {
  activeCount: number
  totalTarget: number
  totalSaved: number
  stillNeeded: number
  overallPercent: number
}

interface WishlistStatsItem {
  targetAmount: string
  currentAmount: string
  status: 'active' | 'paused' | 'completed'
}

/**
 * Builds header stats for wishlist overview surfaces.
 */
export function buildWishlistPageStats(items: WishlistStatsItem[]): WishlistPageStats {
  let activeCount = 0
  let totalTarget = 0
  let totalSaved = 0

  for (const item of items) {
    if (item.status !== 'active') {
      continue
    }

    activeCount += 1
    totalTarget += parseLedgerAmount(item.targetAmount)
    totalSaved += parseLedgerAmount(item.currentAmount)
  }

  const stillNeeded = Math.max(0, totalTarget - totalSaved)
  const overallPercent =
    totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0

  return {
    activeCount,
    totalTarget,
    totalSaved,
    stillNeeded,
    overallPercent,
  }
}

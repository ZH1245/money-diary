import type { AiToolAction } from '#/features/ai/server/ai-tools'

const ACTION_ROUTE_MAP: Partial<Record<AiToolAction, string>> = {
  create_transaction: '/transactions',
  create_saving: '/savings',
  create_goal: '/goals',
  update_goal: '/goals',
  delete_goal: '/goals',
  create_wishlist_item: '/wishlist',
  update_wishlist_item: '/wishlist',
  delete_wishlist_item: '/wishlist',
}

/**
 * Maps a successful AI write action to the app route the user should land on.
 */
export function resolveAiNavigateTo(action: AiToolAction): string | null {
  return ACTION_ROUTE_MAP[action] ?? null
}

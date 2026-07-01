export type TransactionType = 'income' | 'expense' | 'transfer'

/**
 * Returns whether a transaction type must be linked to a category (expense only).
 */
export function requiresTransactionCategory(type: TransactionType) {
  return type === 'expense'
}

/**
 * Resolves the stored category id for a transaction type.
 */
export function resolveTransactionCategoryId(
  type: TransactionType,
  categoryId: number | null | undefined,
): number | null {
  if (type === 'income') {
    return null
  }

  return categoryId ?? null
}

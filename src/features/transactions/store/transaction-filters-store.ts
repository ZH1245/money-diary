import { Store } from '@tanstack/react-store'

/**
 * UI filter state for the transactions screen.
 */
interface TransactionFiltersState {
  searchTerm: string
  type: 'all' | 'income' | 'expense' | 'transfer'
  categoryId: 'all' | string
  accountId: 'all' | string
  dateFrom: string
  dateTo: string
}

const defaultTableFilters = {
  categoryId: 'all' as const,
  accountId: 'all' as const,
  dateFrom: '',
  dateTo: '',
}

/**
 * Central filter store for transactions list controls.
 */
export const transactionFiltersStore = new Store<TransactionFiltersState>({
  searchTerm: '',
  type: 'all',
  ...defaultTableFilters,
})

/**
 * Updates the free-text title search filter.
 */
export function setTransactionSearchTerm(searchTerm: string) {
  transactionFiltersStore.setState((state) => ({
    ...state,
    searchTerm,
  }))
}

/**
 * Updates the transaction type filter.
 */
export function setTransactionType(type: TransactionFiltersState['type']) {
  transactionFiltersStore.setState((state) => ({
    ...state,
    type,
  }))
}

/**
 * Updates the table category filter.
 */
export function setTransactionCategoryFilter(categoryId: 'all' | string) {
  transactionFiltersStore.setState((state) => ({
    ...state,
    categoryId,
  }))
}

/**
 * Updates the table payment-account filter.
 */
export function setTransactionAccountFilter(accountId: 'all' | string) {
  transactionFiltersStore.setState((state) => ({
    ...state,
    accountId,
  }))
}

/**
 * Updates the table date-from filter (yyyy-MM-dd).
 */
export function setTransactionTableDateFrom(dateFrom: string) {
  transactionFiltersStore.setState((state) => ({
    ...state,
    dateFrom,
  }))
}

/**
 * Updates the table date-to filter (yyyy-MM-dd).
 */
export function setTransactionTableDateTo(dateTo: string) {
  transactionFiltersStore.setState((state) => ({
    ...state,
    dateTo,
  }))
}

/**
 * Clears table-only filters (category, account, date range).
 */
export function resetTransactionTableFilters() {
  transactionFiltersStore.setState((state) => ({
    ...state,
    ...defaultTableFilters,
  }))
}

/**
 * Counts active table filters for toolbar badges.
 */
export function countActiveTransactionTableFilters(
  filters: TransactionFiltersState,
): number {
  let count = 0
  if (filters.categoryId !== 'all') count += 1
  if (filters.accountId !== 'all') count += 1
  if (filters.dateFrom) count += 1
  if (filters.dateTo) count += 1
  return count
}

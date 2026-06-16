import { Store } from '@tanstack/react-store'

/**
 * UI filter state for the transactions screen.
 */
interface TransactionFiltersState {
  searchTerm: string
  type: 'all' | 'income' | 'expense' | 'transfer'
}

/**
 * Central filter store for transactions list controls.
 */
export const transactionFiltersStore = new Store<TransactionFiltersState>({
  searchTerm: '',
  type: 'all',
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

/**
 * Transaction record returned by transactions APIs.
 */
export interface TransactionDto {
  id: number
  title: string
  amount: string
  sourceAmount: string | null
  sourceCurrency: string
  exchangeRate: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: number
  source: string | null
  note: string | null
  happenedAt: string
}

/**
 * Payload accepted by the create transaction API.
 */
export interface CreateTransactionInput {
  title: string
  amount: string
  currency?: string
  exchangeRate?: string
  type: 'income' | 'expense' | 'transfer'
  categoryId: number
  source?: string
  note?: string
  happenedAt?: string
}

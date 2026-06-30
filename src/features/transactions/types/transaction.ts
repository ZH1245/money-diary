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
  categoryId: number | null
  paymentAccountId: number | null
  source: string | null
  transferGroupId: string | null
  note: string | null
  status: 'confirmed' | 'draft'
  happenedAt: string
}

/**
 * Payload accepted by the create scheduled transaction API.
 */
export interface CreateScheduledTransactionInput {
  title: string
  amount: string
  currency?: string
  exchangeRate?: string
  type: 'income' | 'expense'
  categoryId: number | null
  paymentAccountId?: number | null
  note?: string
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
  categoryId: number | null
  paymentAccountId?: number | null
  source?: string
  note?: string
  happenedAt?: string
}

/**
 * Payload accepted by the update transaction API.
 */
export interface UpdateTransactionInput {
  title?: string
  amount?: string
  currency?: string
  exchangeRate?: string
  type?: 'income' | 'expense' | 'transfer'
  categoryId?: number | null
  paymentAccountId?: number | null
  source?: string | null
  note?: string | null
  happenedAt?: string
}

/**
 * Payload accepted by the create/update transfer API (two-leg).
 */
export interface TransferInput {
  title: string
  amount: string
  currency?: string
  exchangeRate?: string
  fromPaymentAccountId: number
  toPaymentAccountId: number
  note?: string | null
  happenedAt?: string
}

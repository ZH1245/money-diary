import type { ApiListResponse } from '#/types/api'
import type { CreateTransactionInput, TransactionDto } from '../types/transaction'

/**
 * Loads transactions for the active user context.
 */
export async function getTransactions(): Promise<TransactionDto[]> {
  const response = await fetch('/api/transactions')
  const json = (await response.json()) as ApiListResponse<TransactionDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load transactions')
  }

  return json.data
}

/**
 * Creates a new transaction entry.
 */
export async function createTransaction(input: CreateTransactionInput): Promise<TransactionDto> {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: TransactionDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to create transaction')
  }

  return json.data
}

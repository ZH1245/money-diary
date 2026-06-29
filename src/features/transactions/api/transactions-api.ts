import type { ApiListResponse } from '#/types/api'
import type {
  CreateTransactionInput,
  TransactionDto,
  TransferInput,
  UpdateTransactionInput,
} from '../types/transaction'

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

/**
 * Updates an existing transaction entry.
 */
export async function updateTransaction(id: number, input: UpdateTransactionInput): Promise<TransactionDto> {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: TransactionDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to update transaction')
  }

  return json.data
}

/**
 * Creates a two-leg transfer between payment accounts.
 */
export async function createTransfer(input: TransferInput): Promise<TransactionDto> {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: TransactionDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to create transfer')
  }

  return json.data
}

/**
 * Updates both legs of an existing transfer.
 */
export async function updateTransfer(id: number, input: TransferInput): Promise<TransactionDto> {
  const response = await fetch(`/api/transactions/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: TransactionDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to update transfer')
  }

  return json.data
}

/**
 * Deletes a transaction entry.
 */
export async function deleteTransaction(id: number): Promise<void> {
  const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
  const json = (await response.json()) as { success: boolean; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to delete transaction')
  }
}

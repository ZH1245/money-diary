import type { ApiListResponse } from '#/types/api'
import type {
  CreateScheduledTransactionInput,
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

/**
 * Fetches all pending draft transactions for the active user.
 */
export async function getDraftTransactions(): Promise<TransactionDto[]> {
  const response = await fetch('/api/transactions/drafts')
  const json = (await response.json()) as ApiListResponse<TransactionDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load draft transactions')
  }

  return json.data
}

/**
 * Creates a scheduled transaction as a draft.
 */
export async function createScheduledTransaction(
  input: CreateScheduledTransactionInput,
): Promise<TransactionDto> {
  const response = await fetch('/api/transactions/drafts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: TransactionDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to create scheduled transaction')
  }

  return json.data
}

/**
 * Confirms a draft transaction, committing it to balances.
 */
export async function confirmDraftTransaction(id: number): Promise<TransactionDto> {
  const response = await fetch(`/api/transactions/drafts/${id}`, { method: 'POST' })
  const json = (await response.json()) as { success: boolean; data: TransactionDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to confirm draft transaction')
  }

  return json.data
}

/**
 * Discards a draft transaction permanently.
 */
export async function discardDraftTransaction(id: number): Promise<void> {
  const response = await fetch(`/api/transactions/drafts/${id}`, { method: 'DELETE' })
  const json = (await response.json()) as { success: boolean; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to discard draft transaction')
  }
}

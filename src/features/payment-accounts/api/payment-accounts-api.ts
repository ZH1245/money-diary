import type { ApiListResponse } from '#/types/api'
import type {
  CreatePaymentAccountInput,
  PaymentAccountDto,
  UpdatePaymentAccountInput,
} from '../types/payment-account'

/**
 * Loads payment accounts for the active user context.
 */
export async function getPaymentAccounts(): Promise<PaymentAccountDto[]> {
  const response = await fetch('/api/payment-accounts')
  const json = (await response.json()) as ApiListResponse<PaymentAccountDto>

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to load payment accounts')
  }

  return json.data
}

/**
 * Creates a new payment account.
 */
export async function createPaymentAccount(input: CreatePaymentAccountInput): Promise<PaymentAccountDto> {
  const response = await fetch('/api/payment-accounts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: PaymentAccountDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to create payment account')
  }

  return json.data
}

/**
 * Updates an existing payment account.
 */
export async function updatePaymentAccount(
  id: number,
  input: UpdatePaymentAccountInput,
): Promise<PaymentAccountDto> {
  const response = await fetch(`/api/payment-accounts/${id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const json = (await response.json()) as { success: boolean; data: PaymentAccountDto; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to update payment account')
  }

  return json.data
}

/**
 * Deletes a payment account.
 */
export async function deletePaymentAccount(id: number): Promise<void> {
  const response = await fetch(`/api/payment-accounts/${id}`, { method: 'DELETE' })
  const json = (await response.json()) as { success: boolean; error?: string }

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? 'Unable to delete payment account')
  }
}

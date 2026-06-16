export const PAYMENT_ACCOUNT_TYPES = ['debit', 'credit', 'paypak', 'wallet', 'cash', 'other'] as const

export type PaymentAccountType = (typeof PAYMENT_ACCOUNT_TYPES)[number]

/**
 * Payment account record returned by APIs.
 */
export interface PaymentAccountDto {
  id: number
  name: string
  institutionSlug: string | null
  accountType: PaymentAccountType
  lastFour: string | null
  note: string | null
  isActive: boolean
}

/**
 * Payload accepted by create payment account API.
 */
export interface CreatePaymentAccountInput {
  name: string
  institutionSlug?: string | null
  accountType: PaymentAccountType
  lastFour?: string | null
  note?: string | null
}

/**
 * Payload accepted by update payment account API.
 */
export interface UpdatePaymentAccountInput {
  name?: string
  institutionSlug?: string | null
  accountType?: PaymentAccountType
  lastFour?: string | null
  note?: string | null
  isActive?: boolean
}

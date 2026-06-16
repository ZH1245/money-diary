/**
 * Saving record returned by savings APIs.
 */
export interface SavingDto {
  id: number
  goalId: number | null
  paymentAccountId: number | null
  title: string
  amount: string
  note: string | null
  savedAt: string
}

/**
 * Payload accepted by create savings API.
 */
export interface CreateSavingInput {
  title?: string
  amount: string
  note?: string
  savedAt?: string
  goalId?: number | null
  paymentAccountId?: number | null
}

/**
 * Payload accepted by update savings API.
 */
export interface UpdateSavingInput {
  title?: string
  amount?: string
  note?: string | null
  savedAt?: string
  goalId?: number | null
  paymentAccountId?: number | null
}

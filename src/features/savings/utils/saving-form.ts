export interface SavingFormState {
  amount: string
  entryType: 'deposit' | 'withdrawal'
  note: string
  savedAt: string
  goalId: string
  paymentAccountId: string
}

import { format } from 'date-fns'

/**
 * Returns default values for the savings create/edit form.
 */
export function getDefaultSavingForm(): SavingFormState {
  return {
    amount: '',
    entryType: 'deposit',
    note: '',
    savedAt: format(new Date(), 'yyyy-MM-dd'),
    goalId: 'none',
    paymentAccountId: 'none',
  }
}

/**
 * Builds a human-friendly label for delete confirmations.
 */
export function getSavingDeleteLabel(saving: { note: string | null; savedAt: string; amount: string }): string {
  if (saving.note?.trim()) return saving.note.trim()
  return `${formatSavingDate(saving.savedAt)} · ${saving.amount}`
}

/**
 * Formats a savings date for display.
 */
export function formatSavingDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

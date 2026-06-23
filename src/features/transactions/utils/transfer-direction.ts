export type TransferDirection = 'in' | 'out'

export const TRANSFER_SOURCE_IN = 'transfer:in'
export const TRANSFER_SOURCE_OUT = 'transfer:out'

/** Maps transfer direction to the persisted transaction source token. */
export function formatTransferSource(direction: TransferDirection): string {
  return direction === 'in' ? TRANSFER_SOURCE_IN : TRANSFER_SOURCE_OUT
}

/** Reads transfer direction from a stored transaction source value. */
export function parseTransferDirection(source: string | null | undefined): TransferDirection {
  if (source === TRANSFER_SOURCE_IN || source === 'in') {
    return 'in'
  }

  return 'out'
}

/** Returns true when a transfer row stores an explicit in/out direction. */
export function isTransferDirectionEncoded(source: string | null | undefined): boolean {
  return source === TRANSFER_SOURCE_IN || source === TRANSFER_SOURCE_OUT || source === 'in' || source === 'out'
}

/** Returns true when the source field stores transfer direction metadata. */
export function isTransferSourceToken(source: string | null | undefined): boolean {
  return isTransferDirectionEncoded(source)
}

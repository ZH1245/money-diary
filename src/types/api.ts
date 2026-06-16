/**
 * Shared list response shape returned by API collection endpoints.
 */
export interface ApiListResponse<TItem> {
  success: boolean
  data: TItem[]
  error?: string
}

import { z } from 'zod'

/**
 * Shared string field validators for API payloads.
 */
export const apiTitleSchema = z.string().trim().min(1).max(120)
export const apiNoteSchema = z.string().trim().max(500).optional()
export const apiSourceSchema = z.string().trim().max(120).optional()
export const apiAmountSchema = z.string().trim().min(1).max(24)
export const apiOptionalUserIdSchema = z.string().trim().min(1).max(128).optional()
export const apiIdParamSchema = z.coerce.number().int().positive()

/**
 * Parses a positive numeric amount string.
 */
export function parsePositiveAmount(value: string): number | null {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) return null
  if (parsedValue <= 0) return null
  return parsedValue
}

/**
 * Parses a non-negative numeric amount string.
 */
export function parseNonNegativeAmount(value: string): number | null {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) return null
  if (parsedValue < 0) return null
  return parsedValue
}

/**
 * Parses a positive integer route id param.
 */
export function parseRouteId(value: string): number | null {
  const parsedId = Number(value)
  if (!Number.isInteger(parsedId) || parsedId <= 0) return null
  return parsedId
}

/**
 * Coerce Payload relationship fields from API bodies.
 * USelectMenu often binds `{ value, label }` instead of a bare id string.
 */
export function asNullableRelationship(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const v = value.trim()
    if (!v) return null
    return /^\d+$/.test(v) ? Number(v) : v
  }
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>
    if ('value' in o && o.value !== '' && o.value != null) {
      return asNullableRelationship(o.value)
    }
    if ('id' in o && o.id !== '' && o.id != null) {
      return asNullableRelationship(o.id)
    }
  }
  return null
}

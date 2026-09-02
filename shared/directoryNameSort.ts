const NAME_PREFIXES = /^(?:rev\.?\s*)?(?:dr\.?\s*)/i
const NAME_SUFFIXES = /(?:,?\s*(?:jr\.?|sr\.?|ii|iii|iv)\.?)$/i

function lastNameFromEmail(email?: string | null): string | null {
  const normalized = String(email ?? '').trim().toLowerCase()
  if (!normalized.includes('@')) return null
  const local = normalized.split('@')[0] ?? ''
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length < 2) return null
  return parts[parts.length - 1] ?? null
}

/** Last name for directory sorting; prefers ATS-style first.last email when present. */
export function directoryLastName(name?: string | null, email?: string | null): string {
  const fromEmail = lastNameFromEmail(email)
  if (fromEmail) return fromEmail

  let cleaned = String(name ?? '').trim()
  if (!cleaned) return ''

  cleaned = cleaned.replace(NAME_PREFIXES, '').replace(NAME_SUFFIXES, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  while (parts.length > 1 && /^[A-Za-z]\.?$/.test(parts[0] ?? '')) {
    parts.shift()
  }
  return (parts[parts.length - 1] ?? cleaned).toLowerCase()
}

export function compareDirectoryByLastName(
  a: { name?: string | null; email?: string | null },
  b: { name?: string | null; email?: string | null },
): number {
  const byLast = directoryLastName(a.name, a.email).localeCompare(
    directoryLastName(b.name, b.email),
    undefined,
    { sensitivity: 'base' },
  )
  if (byLast !== 0) return byLast
  return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })
}

export function sortDirectoryByLastName<T extends { name?: string | null; email?: string | null }>(
  list: readonly T[],
): T[] {
  return [...list].sort(compareDirectoryByLastName)
}

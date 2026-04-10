/**
 * Turn an upload filename into a short, readable title: strip path + extension,
 * replace separators with spaces, light title case (preserves 2–5 letter acronyms).
 */
export function humanizeFilename(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== 'string') return 'Untitled upload'

  const base = raw.trim().replace(/^.*[/\\]/u, '') || raw.trim()
  if (!base) return 'Untitled upload'

  let stem = base
  const lastDot = base.lastIndexOf('.')
  if (lastDot > 0 && lastDot < base.length - 1) {
    stem = base.slice(0, lastDot)
  }
  if (!stem.trim()) stem = base

  const spaced = stem
    .replace(/_/g, ' ')
    .replace(/[-–—]+/g, ' ')
    .replace(/\.+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!spaced) return 'Untitled upload'

  return spaced
    .split(/\s+/)
    .map((word) => {
      if (!word) return word
      if (/^[A-Z]{2,5}\d?$/u.test(word)) return word
      const lower = word.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

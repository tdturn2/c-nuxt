export interface DegreeListItem {
  id: number
  name?: string
  title?: string
  code?: string | null
  catalogYear?: number | string | null
  catalog_year?: number | string | null
  displayLabel?: string | null
}

export type DegreeSortKey = 'year-desc' | 'year-asc' | 'name-asc' | 'name-desc' | 'code-asc' | 'code-desc'

export const DEGREE_SORT_OPTIONS: Array<{ value: DegreeSortKey; label: string }> = [
  { value: 'year-desc', label: 'Newest catalog year' },
  { value: 'year-asc', label: 'Oldest catalog year' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'code-asc', label: 'Code A–Z' },
  { value: 'code-desc', label: 'Code Z–A' },
]

export function degreeName(d: DegreeListItem) {
  return String(d.name ?? d.title ?? d.displayLabel ?? '').trim()
}

export function degreeCode(d: DegreeListItem) {
  return String(d.code ?? '').trim()
}

export function catalogYearNumber(d: DegreeListItem): number | null {
  const raw = d.catalogYear ?? d.catalog_year
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  return Number.isFinite(n) ? n : null
}

export function catalogYearLabel(d: DegreeListItem) {
  const year = catalogYearNumber(d)
  return year == null ? '—' : String(year)
}

export function degreeOptionLabel(d: DegreeListItem) {
  const name = degreeName(d) || `Degree #${d.id}`
  const code = degreeCode(d)
  const year = catalogYearLabel(d)
  return [name, code, year === '—' ? '' : year].filter(Boolean).join(' · ')
}

function compareYear(a: DegreeListItem, b: DegreeListItem, direction: 'asc' | 'desc') {
  const yearA = catalogYearNumber(a)
  const yearB = catalogYearNumber(b)
  if (yearA == null && yearB == null) return 0
  if (yearA == null) return 1
  if (yearB == null) return -1
  return direction === 'desc' ? yearB - yearA : yearA - yearB
}

export function compareDegrees(a: DegreeListItem, b: DegreeListItem, sort: DegreeSortKey) {
  const nameCmp = degreeName(a).localeCompare(degreeName(b), undefined, { sensitivity: 'base' })
  const codeCmp = degreeCode(a).localeCompare(degreeCode(b), undefined, { sensitivity: 'base' })
  const yearCmp = compareYear(a, b, 'desc')
  switch (sort) {
    case 'year-desc':
      return compareYear(a, b, 'desc') || nameCmp || codeCmp
    case 'year-asc':
      return compareYear(a, b, 'asc') || nameCmp || codeCmp
    case 'name-asc':
      return nameCmp || yearCmp || codeCmp
    case 'name-desc':
      return -nameCmp || yearCmp || codeCmp
    case 'code-asc':
      return codeCmp || nameCmp || yearCmp
    case 'code-desc':
      return -codeCmp || nameCmp || yearCmp
  }
}

export function sortDegrees(list: DegreeListItem[], sort: DegreeSortKey) {
  return [...list].sort((a, b) => compareDegrees(a, b, sort))
}

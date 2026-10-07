/** Shared academic term codes for Class Search and faculty Teaching Schedule. */

export type TermOption = { label: string; value: string }

/** Default selected term for Class Search. */
export const DEFAULT_CLASS_SEARCH_TERM = 'SP27'

/**
 * Recently opened terms (newest first). Prepended to the historical FA/SU/SP list
 * in Class Search. Update when registration opens a new semester.
 */
export const OPEN_CLASS_SEARCH_TERMS: TermOption[] = [
  { label: 'Spring 2027', value: 'SP27' },
  { label: 'Fall 2026', value: 'FA26' },
  { label: 'Summer 2026', value: 'SU26' },
  { label: 'Spring 2026', value: 'SP26' },
]

/**
 * Terms shown on faculty Teaching Schedule: current semester + future opened terms.
 * Ordered current → future. Update when the active semester rolls forward.
 */
export const TEACHING_SCHEDULE_TERMS: TermOption[] = [
  { label: 'Fall 2026', value: 'FA26' },
  { label: 'Spring 2027', value: 'SP27' },
]

/** Build Class Search semester dropdown (open terms + historical years). */
export function buildClassSearchTermOptions(
  historyEndYear = 25,
  historyStartYear = 17,
): TermOption[] {
  const seen = new Set(OPEN_CLASS_SEARCH_TERMS.map((t) => t.value))
  const terms: TermOption[] = [...OPEN_CLASS_SEARCH_TERMS]
  for (let y = historyEndYear; y >= historyStartYear; y--) {
    const year = 2000 + y
    for (const [label, prefix] of [
      ['Fall', 'FA'],
      ['Summer', 'SU'],
      ['Spring', 'SP'],
    ] as const) {
      const value = `${prefix}${y}`
      if (seen.has(value)) continue
      terms.push({ label: `${label} ${year}`, value })
    }
  }
  return terms
}

export function defaultClassSearchTerm(
  options: TermOption[] = buildClassSearchTermOptions(),
): TermOption {
  return options.find((t) => t.value === DEFAULT_CLASS_SEARCH_TERM) ?? options[0]!
}

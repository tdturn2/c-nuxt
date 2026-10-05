/**
 * Named highlights on the chapel calendar (a day or a run of days).
 * Color keys stay in sync with connect-api `src/routes/chapel-calendar-themes.ts`.
 */

export const CHAPEL_CALENDAR_THEME_COLORS = {
  gold: { label: 'Gold', swatch: '#ab9031', ink: '#1c1606' },
  teal: { label: 'Teal', swatch: '#0d5e82', ink: '#ffffff' },
  burgundy: { label: 'Burgundy', swatch: '#7a2e3b', ink: '#ffffff' },
  forest: { label: 'Forest', swatch: '#2f6b4f', ink: '#ffffff' },
  purple: { label: 'Purple', swatch: '#5b3a8c', ink: '#ffffff' },
  slate: { label: 'Slate', swatch: '#3f4c5a', ink: '#ffffff' },
} as const

export type ChapelCalendarThemeColor = keyof typeof CHAPEL_CALENDAR_THEME_COLORS

export type ChapelCalendarTheme = {
  id: number
  label: string
  startDate: string
  endDate: string
  color: ChapelCalendarThemeColor
  note: string | null
  active: boolean
}

export type ChapelCalendarThemeBar = {
  key: string
  themeId: number
  col: number
  span: number
  row: number
  label: string
  color: ChapelCalendarThemeColor
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function isChapelCalendarThemeColor(value: string): value is ChapelCalendarThemeColor {
  return Object.prototype.hasOwnProperty.call(CHAPEL_CALENDAR_THEME_COLORS, value)
}

export function normalizeChapelCalendarThemeColor(value: unknown): ChapelCalendarThemeColor {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return isChapelCalendarThemeColor(key) ? key : 'gold'
}

export function themeSwatch(color: unknown): string {
  return CHAPEL_CALENDAR_THEME_COLORS[normalizeChapelCalendarThemeColor(color)].swatch
}

export function themeInk(color: unknown): string {
  return CHAPEL_CALENDAR_THEME_COLORS[normalizeChapelCalendarThemeColor(color)].ink
}

export function themeTint(color: unknown, alpha = 0.16): string {
  const hex = themeSwatch(color).replace('#', '')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function parseYmd(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return { y, m, d }
}

export function themeCoversDate(
  theme: { startDate: string; endDate: string; active?: boolean },
  date: string,
  options?: { includeInactive?: boolean },
): boolean {
  if (theme.active === false && !options?.includeInactive) return false
  return date >= theme.startDate && date <= theme.endDate
}

export function themesOnDate<T extends { startDate: string; endDate: string; active?: boolean; label: string }>(
  themes: T[],
  date: string,
): T[] {
  return themes
    .filter((theme) => themeCoversDate(theme, date))
    .sort((a, b) => {
      const lengthA = daysBetween(a.startDate, a.endDate)
      const lengthB = daysBetween(b.startDate, b.endDate)
      return lengthA - lengthB || a.startDate.localeCompare(b.startDate) || a.label.localeCompare(b.label)
    })
}

function daysBetween(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`)
  const b = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 9999
  return Math.round((b - a) / 86_400_000)
}

export function primaryThemeForDate<T extends { startDate: string; endDate: string; active?: boolean; label: string }>(
  themes: T[],
  date: string,
): T | null {
  return themesOnDate(themes, date)[0] ?? null
}

/**
 * Contiguous theme runs inside one Sunday–Saturday row.
 * `dates` is length 7; null entries are padding outside the month.
 */
export function themeBarsForWeek(
  dates: Array<string | null>,
  themes: Array<{
    id: number
    label: string
    startDate: string
    endDate: string
    color: unknown
    active?: boolean
  }>,
): ChapelCalendarThemeBar[] {
  const runs: Array<Omit<ChapelCalendarThemeBar, 'row'>> = []
  for (const theme of themes) {
    if (theme.active === false) continue
    let col = 0
    while (col < dates.length) {
      const date = dates[col]
      if (!date || !themeCoversDate(theme, date)) {
        col += 1
        continue
      }
      let end = col
      while (end + 1 < dates.length) {
        const next = dates[end + 1]
        if (!next || !themeCoversDate(theme, next)) break
        end += 1
      }
      runs.push({
        key: `${theme.id}-${col}`,
        themeId: theme.id,
        col,
        span: end - col + 1,
        label: theme.label,
        color: normalizeChapelCalendarThemeColor(theme.color),
      })
      col = end + 1
    }
  }

  runs.sort((a, b) => a.col - b.col || b.span - a.span || a.label.localeCompare(b.label))
  const rowEnds: number[] = []
  return runs.map((run) => {
    let row = rowEnds.findIndex((end) => end <= run.col)
    if (row < 0) {
      row = rowEnds.length
      rowEnds.push(0)
    }
    rowEnds[row] = run.col + run.span
    return { ...run, row }
  })
}

export function formatThemeRange(startDate: string, endDate: string): string {
  const start = parseYmd(startDate)
  const end = parseYmd(endDate)
  if (!start || !end) return startDate === endDate ? startDate : `${startDate} – ${endDate}`
  const startMonth = MONTHS[start.m - 1]
  const endMonth = MONTHS[end.m - 1]
  if (startDate === endDate) return `${startMonth} ${start.d}, ${start.y}`
  if (start.y === end.y && start.m === end.m) return `${startMonth} ${start.d}–${end.d}, ${start.y}`
  if (start.y === end.y) return `${startMonth} ${start.d} – ${endMonth} ${end.d}, ${start.y}`
  return `${startMonth} ${start.d}, ${start.y} – ${endMonth} ${end.d}, ${end.y}`
}

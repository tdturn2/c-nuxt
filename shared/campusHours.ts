export const CAMPUS_HOURS_FACILITIES = [
  { key: 'student_center', label: 'Student Center' },
  { key: 'dining_hall', label: 'Dining Hall' },
  { key: 'spo', label: 'SPO' },
  { key: 'library', label: 'Library' },
  { key: 'chapel', label: 'Chapel' },
  { key: 'eucharist', label: 'Eucharist' },
] as const

export type CampusHoursFacilityKey = (typeof CAMPUS_HOURS_FACILITIES)[number]['key']

export const CAMPUS_HOURS_FACILITY_KEYS = CAMPUS_HOURS_FACILITIES.map((facility) => facility.key)

/** Visual week order matching the old Connect table (Mon–Sun). */
export const CAMPUS_HOURS_DISPLAY_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function weekdayShortLabel(weekday: number): string {
  return WEEKDAY_SHORT[weekday] ?? ''
}

export function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return { y, m, d }
}

export function formatCampusHoursDate(ymd: string): string {
  const parsed = parseYmd(ymd)
  if (!parsed) return ymd
  const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, 12))
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', timeZone: 'UTC' })
}

export function weekdayFromYmd(ymd: string): number {
  const parsed = parseYmd(ymd)
  if (!parsed) return 0
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, 12)).getUTCDay()
}

export function addDaysYmd(ymd: string, days: number): string {
  const parsed = parseYmd(ymd)
  if (!parsed) return ymd
  const dt = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, 12))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export const CAMPUS_HOURS_TZ = 'America/New_York'

export function ymdInTimeZone(date = new Date(), timeZone = CAMPUS_HOURS_TZ): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return y && m && d ? `${y}-${m}-${d}` : ''
}

export function mondayOfWeek(ymd: string): string {
  const weekday = weekdayFromYmd(ymd)
  const diffToMonday = (weekday + 6) % 7
  return addDaysYmd(ymd, -diffToMonday)
}

/** `date` picks which week to show; `today` stays the calendar day. */
export function resolveDisplayedWeek(requestedDate: string | undefined, today: string) {
  const requested = String(requestedDate || '').trim().slice(0, 10)
  const anchor = parseYmd(requested) ? requested : today
  const weekStart = mondayOfWeek(anchor)
  return { today, weekStart, weekEnd: addDaysYmd(weekStart, 6) }
}

export function normalizeHours(value: string | null | undefined): string {
  return String(value ?? '').trim()
}

export function isClosedHours(value: string | null | undefined): boolean {
  return normalizeHours(value).toLowerCase() === 'closed'
}

export function emptyWeeklyGrid(): Record<string, Record<string, string>> {
  const weekly: Record<string, Record<string, string>> = {}
  for (let weekday = 0; weekday <= 6; weekday++) {
    weekly[String(weekday)] = {}
    for (const facility of CAMPUS_HOURS_FACILITIES) weekly[String(weekday)]![facility.key] = ''
  }
  return weekly
}

type SeasonCover = { id: number; startDate: string; endDate: string }

export function pickSeasonForDate<T extends SeasonCover>(ymd: string, seasons: T[]): T | null {
  const covering = seasons.filter((season) => season.startDate <= ymd && ymd <= season.endDate)
  covering.sort((a, b) => (a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0))
  return covering[0] ?? null
}

export type WeeklyCell = { weekday: number; facility: string; hours: string | null }
export type DayException = {
  date: string
  facility: string | null
  hours: string | null
  closedAll: boolean
  note: string | null
}

export function resolveDay(opts: {
  ymd: string
  weekly: WeeklyCell[]
  exceptions: DayException[]
}) {
  const weekday = weekdayFromYmd(opts.ymd)
  const cells: Record<string, string> = {}
  for (const facility of CAMPUS_HOURS_FACILITIES) {
    const row = opts.weekly.find((cell) => cell.weekday === weekday && cell.facility === facility.key)
    cells[facility.key] = normalizeHours(row?.hours)
  }
  const dayExceptions = opts.exceptions.filter((item) => item.date === opts.ymd)
  if (dayExceptions.some((item) => item.closedAll)) {
    for (const facility of CAMPUS_HOURS_FACILITIES) cells[facility.key] = 'closed'
  }
  for (const item of dayExceptions) {
    if (item.closedAll || !item.facility) continue
    cells[item.facility] = normalizeHours(item.hours)
  }
  const closedAll = CAMPUS_HOURS_FACILITIES.every((facility) => isClosedHours(cells[facility.key]))
  const notes = [...new Set(dayExceptions.map((item) => normalizeHours(item.note)).filter(Boolean))]
  return { date: opts.ymd, weekday, cells, closedAll, notes }
}

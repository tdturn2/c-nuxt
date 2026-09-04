/**
 * Scheduled in-app toasts (chapel announcements, etc.).
 * daysOfWeek uses JS getDay(): 0=Sun … 6=Sat.
 */
export type ConnectToast = {
  id: number
  title: string | null
  message: string
  href: string | null
  hrefLabel: string | null
  daysOfWeek: number[]
  sendTime: string
  timezone: string
  enabled: boolean
  sortOrder: number | null
}

export const TOAST_DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
] as const

export const DEFAULT_TOAST_TIMEZONE = 'America/New_York'

/** How long after sendTime a toast may still appear (covers late loads / throttled tabs). */
export const TOAST_GRACE_MINUTES = 5

/** Parts of "now" in a given IANA timezone. */
export function zonedDateParts(
  date: Date,
  timeZone = DEFAULT_TOAST_TIMEZONE,
): { year: number; month: number; day: number; weekday: number; hour: number; minute: number; dateKey: string } {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(
    dtf.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  ) as Record<string, string>

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)
  const hour = Number(parts.hour)
  const minute = Number(parts.minute)
  const weekday = weekdayMap[parts.weekday || ''] ?? 0

  return {
    year,
    month,
    day,
    weekday,
    hour,
    minute,
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  }
}

export function toastScheduleKey(toast: Pick<ConnectToast, 'id' | 'sendTime'>, dateKey: string): string {
  return `connect-toast:${toast.id}:${dateKey}:${toast.sendTime}`
}

/**
 * True when now is on a scheduled day and within [sendTime, sendTime + graceMinutes]
 * in the toast timezone. Default grace covers late page loads without requiring
 * a hard refresh at the exact minute.
 */
export function isToastDueNow(
  toast: Pick<ConnectToast, 'daysOfWeek' | 'sendTime' | 'timezone' | 'enabled'>,
  now = new Date(),
  graceMinutes = TOAST_GRACE_MINUTES,
): { due: boolean; dateKey: string } {
  if (toast.enabled === false) return { due: false, dateKey: '' }
  const tz = toast.timezone || DEFAULT_TOAST_TIMEZONE
  const parts = zonedDateParts(now, tz)
  const [hh, mm] = String(toast.sendTime || '').split(':').map((n) => Number(n))
  const days = Array.isArray(toast.daysOfWeek) ? toast.daysOfWeek : []
  if (!days.includes(parts.weekday) || !Number.isFinite(hh) || !Number.isFinite(mm)) {
    return { due: false, dateKey: parts.dateKey }
  }

  const scheduled = hh * 60 + mm
  const current = parts.hour * 60 + parts.minute
  const grace = Math.max(0, graceMinutes)
  const due = current >= scheduled && current <= scheduled + grace
  return { due, dateKey: parts.dateKey }
}

import { createError, defineEventHandler } from 'h3'
import { addDaysYmd, isClosedHours, mondayOfWeek, ymdInTimeZone } from '@shared/campusHours'
import { resolveConnectApiUrl } from '../../utils/connectApi'

type CampusHoursDay = {
  date?: string
  closedAll?: boolean
  cells?: Record<string, string>
  notes?: string[]
}

type EucharistEntry = {
  id: string | number
  date?: string
  location?: string
  eucharistSpeaker?: string
  connectUser?: { name?: string } | null
}

export type EucharistMonthDay = {
  date: string
  hours: string
  detail: string
  location: string
  speakerName: string
}

function monthBounds(today: string) {
  const month = today.slice(0, 7)
  const [year, monthNumber] = month.split('-').map(Number)
  const start = `${month}-01`
  const days = year && monthNumber ? new Date(Date.UTC(year, monthNumber, 0)).getUTCDate() : 28
  const end = `${month}-${String(days).padStart(2, '0')}`
  return { month, start, end }
}

function weekStartsCovering(start: string, end: string): string[] {
  const starts: string[] = []
  let cursor = mondayOfWeek(start)
  while (cursor <= end) {
    starts.push(cursor)
    cursor = addDaysYmd(cursor, 7)
  }
  return starts
}

function standingEucharist(day: CampusHoursDay): { hours: string; detail: string } | null {
  const date = typeof day.date === 'string' ? day.date.slice(0, 10) : ''
  if (!date || day.closedAll) return null
  const hours = typeof day.cells?.eucharist === 'string' ? day.cells.eucharist.trim() : ''
  if (!hours || isClosedHours(hours)) return null
  const detail = Array.isArray(day.notes)
    ? day.notes.map((note) => String(note || '').trim()).filter(Boolean).join(' · ')
    : ''
  return { hours, detail }
}

export default defineEventHandler(async () => {
  const connectApiUrl = resolveConnectApiUrl().replace(/\/+$/, '')
  if (!connectApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'CONNECT_API is not configured' })
  }

  const today = ymdInTimeZone()
  const { month, start, end } = monthBounds(today)
  const headers = { 'Content-Type': 'application/json' }

  const entriesParams = new URLSearchParams()
  entriesParams.set('limit', '200')
  entriesParams.set('sort', 'date')
  entriesParams.set('depth', '1')
  entriesParams.set('where[active][equals]', 'true')
  entriesParams.set('where[date][greater_than_equal]', start)
  entriesParams.set('where[date][less_than_equal]', end)

  try {
    const weeks = weekStartsCovering(start, end)
    const [entriesRes, ...hoursWeeks] = await Promise.all([
      $fetch<{ docs?: EucharistEntry[] }>(
        `${connectApiUrl}/api/connect-daily-eucharist-entries?${entriesParams.toString()}`,
        { headers },
      ),
      ...weeks.map((date) =>
        $fetch<{ days?: CampusHoursDay[] }>(`${connectApiUrl}/api/campus-hours/week?date=${encodeURIComponent(date)}`).catch(
          () => ({ days: [] as CampusHoursDay[] }),
        ),
      ),
    ])

    const byDate = new Map<string, EucharistMonthDay>()
    for (const week of hoursWeeks) {
      for (const day of week.days || []) {
        const standing = standingEucharist(day)
        const date = typeof day.date === 'string' ? day.date.slice(0, 10) : ''
        if (!standing || date < start || date > end || byDate.has(date)) continue
        byDate.set(date, { date, hours: standing.hours, detail: standing.detail, location: '', speakerName: '' })
      }
    }

    for (const entry of entriesRes.docs || []) {
      const date = entry.date ? String(entry.date).slice(0, 10) : ''
      if (!date || date < start || date > end) continue
      const existing = byDate.get(date) || { date, hours: '', detail: '', location: '', speakerName: '' }
      const speaker = entry.eucharistSpeaker?.trim() || entry.connectUser?.name || ''
      const location = entry.location?.trim() || ''
      byDate.set(date, {
        ...existing,
        location: [existing.location, location].filter(Boolean).join(' · '),
        speakerName: [existing.speakerName, speaker].filter(Boolean).join(' · '),
      })
    }

    const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    return { today, month, start, end, days }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to load the Daily Eucharist month',
      data: error?.data,
    })
  }
})

import { createError, defineEventHandler } from 'h3'

type ChapelEpisode = {
  id: string | number
  date?: string
  title?: string
  speaker?: {
    id?: string | number
    name?: string
    speakerDescription?: string
    photo?: { url?: string } | null
  } | null
}

function dateOnly(value: string | undefined): string {
  return String(value || '').slice(0, 10)
}

function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  return new Date(Date.UTC(y, mo - 1, d))
}

function startOfWeekMondayUtc(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay()
  const diffToMonday = (day + 6) % 7
  utc.setUTCDate(utc.getUTCDate() - diffToMonday)
  return utc
}

function weekdayUtc(date: Date): number {
  return date.getUTCDay()
}

function toYmdUtc(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = (config.public.payloadBaseUrl || 'http://localhost:3002').replace(/\/+$/, '')
  const payloadServerBearer = String(config.payloadServerBearer || '').trim()

  const today = new Date()
  const thisWeekMonday = startOfWeekMondayUtc(today)
  const thisWeekTuesday = new Date(thisWeekMonday)
  thisWeekTuesday.setUTCDate(thisWeekMonday.getUTCDate() + 1)
  const thisWeekThursday = new Date(thisWeekMonday)
  thisWeekThursday.setUTCDate(thisWeekMonday.getUTCDate() + 3)
  const thisWeekFriday = new Date(thisWeekMonday)
  thisWeekFriday.setUTCDate(thisWeekMonday.getUTCDate() + 4)

  const makeParams = (includeDraft: boolean) => {
    const params = new URLSearchParams()
    params.set('depth', '3')
    params.set('limit', '200')
    params.set('sort', 'date')
    if (includeDraft) params.set('draft', 'true')
    params.set('where[date][greater_than_equal]', toYmdUtc(thisWeekTuesday))
    // Use exclusive Friday upper bound so Thursday rows with stored times are included.
    params.set('where[date][less_than]', toYmdUtc(thisWeekFriday))
    return params
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (payloadServerBearer) headers.Authorization = `Bearer ${payloadServerBearer}`

  try {
    let res: any
    try {
      // Preferred: include draft entries for upcoming Tue/Wed/Thu.
      res = await $fetch(`${payloadBaseUrl}/api/chapel-podcasts?${makeParams(true).toString()}`, { headers })
    } catch {
      // Fallback for DBs missing drafts version tables.
      res = await $fetch(`${payloadBaseUrl}/api/chapel-podcasts?${makeParams(false).toString()}`, { headers })
    }
    const docs = Array.isArray(res?.docs) ? (res.docs as ChapelEpisode[]) : []

    const mondayKey = toYmdUtc(thisWeekMonday)
    const items = docs
      .map((ep) => {
        const ymd = dateOnly(ep.date)
        const parsed = parseDateOnly(ymd)
        if (!parsed) return null
        const epMonday = startOfWeekMondayUtc(parsed)
        if (toYmdUtc(epMonday) !== mondayKey) return null
        const wd = weekdayUtc(parsed)
        if (wd < 2 || wd > 4) return null // Tue/Wed/Thu
        return {
          id: ep.id,
          date: ymd,
          title: ep.title || 'Chapel',
          weekday: wd,
          speaker: ep.speaker || null,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    return {
      weekStart: mondayKey,
      entries: items,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch current chapel week',
      data: error?.data,
    })
  }
})

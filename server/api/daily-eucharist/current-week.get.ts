import { createError, defineEventHandler } from 'h3'

type DailyEucharistEntry = {
  id: string | number
  date?: string
  location?: string
  eucharistSpeaker?: string
  connectUser?: {
    id?: string | number
    name?: string
    avatar?: { url?: string } | null
  } | null
  speakerPhoto?: { url?: string } | null
  active?: boolean
}

function startOfWeekMondayUtc(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay()
  const diffToMonday = (day + 6) % 7
  utc.setUTCDate(utc.getUTCDate() - diffToMonday)
  return utc
}

function toYmdUtc(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function absoluteUrl(baseUrl: string, raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = String(config.public.connectApi || 'http://localhost:3003').replace(/\/+$/, '')

  const weekStart = startOfWeekMondayUtc(new Date())
  const weekEndExclusive = new Date(weekStart)
  weekEndExclusive.setUTCDate(weekStart.getUTCDate() + 7)

  const settingsParams = new URLSearchParams()
  settingsParams.set('limit', '1')
  settingsParams.set('sort', '-updatedAt')
  settingsParams.set('depth', '0')

  const entriesParams = new URLSearchParams()
  entriesParams.set('limit', '100')
  entriesParams.set('sort', 'date')
  entriesParams.set('depth', '2')
  entriesParams.set('where[active][equals]', 'true')
  entriesParams.set('where[date][greater_than_equal]', toYmdUtc(weekStart))
  entriesParams.set('where[date][less_than]', toYmdUtc(weekEndExclusive))

  try {
    const entriesRes = await $fetch<any>(`${payloadBaseUrl}/api/connect-daily-eucharist-entries?${entriesParams.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    const settingsRes = await $fetch<any>(`${payloadBaseUrl}/api/connect-settings?${settingsParams.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null)

    const settingsDoc = Array.isArray(settingsRes?.docs) ? settingsRes.docs[0] || null : null
    const enabledThisWeek = settingsDoc?.dailyEucharist?.enabledThisWeek === true
    const summary = typeof settingsDoc?.dailyEucharist?.summary === 'string'
      ? settingsDoc.dailyEucharist.summary.trim()
      : ''

    const docs: DailyEucharistEntry[] = Array.isArray(entriesRes?.docs) ? entriesRes.docs : []
    const entries = docs.map((entry) => ({
      id: entry.id,
      date: entry.date ? String(entry.date).slice(0, 10) : '',
      location: entry.location || '',
      speakerName: entry.eucharistSpeaker?.trim() || entry.connectUser?.name || 'TBD',
      connectUser: entry.connectUser
        ? {
            id: entry.connectUser.id,
            name: entry.connectUser.name || '',
            avatarUrl: absoluteUrl(payloadBaseUrl, entry.connectUser.avatar?.url),
          }
        : null,
      speakerPhotoUrl: absoluteUrl(payloadBaseUrl, entry.speakerPhoto?.url),
    }))

    return {
      enabledThisWeek,
      summary,
      weekStart: toYmdUtc(weekStart),
      entries,
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch Daily Eucharist data',
      data: error?.data,
    })
  }
})

import { createError, defineEventHandler } from 'h3'

type SliderItem = {
  id: number | string
  title?: string
  href?: string
  openInNewTab?: boolean
  startAt?: string | null
  endAt?: string | null
  active?: boolean
  sortOrder?: number
  image?: any
}

/** Inclusive calendar-day window: startAt from 00:00, endAt through 23:59:59.999 local time. */
function isWithinDateRange(item: SliderItem, now = new Date()): boolean {
  const startRaw = typeof item.startAt === 'string' ? item.startAt.trim() : ''
  const endRaw = typeof item.endAt === 'string' ? item.endAt.trim() : ''

  if (startRaw) {
    const start = new Date(startRaw.length <= 10 ? `${startRaw}T00:00:00` : startRaw)
    if (!Number.isNaN(start.getTime()) && now < start) return false
  }

  if (endRaw) {
    const end = new Date(endRaw.length <= 10 ? `${endRaw}T23:59:59.999` : endRaw)
    if (!Number.isNaN(end.getTime()) && now > end) return false
  }

  return true
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const configuredBaseUrl = config.public.connectApi || ''
  const params = new URLSearchParams()
  params.set('sort', 'sortOrder,-updatedAt')
  params.set('limit', '50')
  params.set('depth', '1')

  try {
    const candidateBaseUrls = [configuredBaseUrl, 'http://localhost:3003'].filter(Boolean)
    for (const baseUrl of candidateBaseUrls) {
      const res: any = await $fetch(`${baseUrl}/api/connect-home-slider-items?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
      })
      const docs: SliderItem[] = Array.isArray(res?.docs) ? res.docs : []
      const filtered = docs.filter((item) => item?.active !== false && isWithinDateRange(item))
      if (filtered.length > 0) return { docs: filtered }
      if (baseUrl === candidateBaseUrls[candidateBaseUrls.length - 1]) return { docs: filtered }
    }
    return { docs: [] }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch home slider items',
      data: error?.data,
    })
  }
})

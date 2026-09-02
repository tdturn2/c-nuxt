import { createError, defineEventHandler, setHeader } from 'h3'
import { resolveConnectApiUrl, toBrowserMediaUrl } from '../utils/connectApi'

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

function withBrowserImage(item: SliderItem): SliderItem {
  const image = item.image
  if (!image || typeof image !== 'object') return item
  const url = toBrowserMediaUrl(image.url || image.file?.url)
  if (!url) return item
  return { ...item, image: { ...image, url } }
}

export default defineEventHandler(async (event) => {
  const baseUrl = resolveConnectApiUrl()
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }
  const params = new URLSearchParams()
  params.set('sort', 'sortOrder,-updatedAt')
  params.set('limit', '50')
  params.set('depth', '1')

  try {
    const res: any = await $fetch(`${baseUrl}/api/connect-home-slider-items?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    const docs: SliderItem[] = Array.isArray(res?.docs) ? res.docs : []
    const filtered = docs
      .filter((item) => item?.active !== false && isWithinDateRange(item))
      .map(withBrowserImage)
    setHeader(event, 'Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
    return { docs: filtered }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch home slider items',
      data: error?.data,
    })
  }
})

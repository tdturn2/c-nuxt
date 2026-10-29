import { createError, defineEventHandler } from 'h3'

const HOMEPAGE_FEATURED_LIMIT = 8

function absoluteUrl(baseUrl: string, raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`
}

function releaseDateSortValue(raw: unknown): number {
  if (!raw) return Number.NEGATIVE_INFINITY
  const t = Date.parse(`${String(raw).slice(0, 10)}T12:00:00Z`)
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY
}

function updatedAtSortValue(raw: unknown): number {
  if (!raw) return Number.NEGATIVE_INFINITY
  const t = Date.parse(String(raw))
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = String(config.public.connectApi || 'http://localhost:3003').replace(/\/+$/, '')
  const payloadServerBearer = String(config.payloadServerBearer || '').trim()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (payloadServerBearer) headers.Authorization = `Bearer ${payloadServerBearer}`

  const settingsParams = new URLSearchParams()
  settingsParams.set('sort', '-updatedAt')
  settingsParams.set('limit', '1')
  settingsParams.set('depth', '2')

  try {
    const settingsRes: any = await $fetch(`${payloadBaseUrl}/api/connect-settings?${settingsParams.toString()}`, { headers })
    const settings = Array.isArray(settingsRes?.docs) ? settingsRes.docs[0] || null : null
    const books = Array.isArray(settings?.featuredBooks) ? settings.featuredBooks : []

    const ranked = books
      .map((book: any, index: number) => ({
        id: book?.id,
        title: book?.title || 'Untitled',
        image: absoluteUrl(payloadBaseUrl, book?.image?.url),
        link: typeof book?.link === 'string' && book.link.trim() ? book.link.trim() : null,
        releaseDate: releaseDateSortValue(book?.releaseDate),
        updatedAt: updatedAtSortValue(book?.updatedAt),
        index,
      }))
      .filter((book) => book.id != null && book.image)
      .sort((a, b) => b.releaseDate - a.releaseDate || b.updatedAt - a.updatedAt || a.index - b.index)
      .slice(0, HOMEPAGE_FEATURED_LIMIT)
      .map(({ id, title, image, link }) => ({ id, title, image, link }))

    return { books: ranked }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch featured books',
      data: error?.data,
    })
  }
})

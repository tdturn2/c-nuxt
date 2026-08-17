import { createError, defineEventHandler } from 'h3'

function absoluteUrl(baseUrl: string, raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`
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

    return {
      books: books
        .map((book: any) => ({
          id: book?.id,
          title: book?.title || 'Untitled',
          image: absoluteUrl(payloadBaseUrl, book?.image?.url),
          link: typeof book?.link === 'string' && book.link.trim() ? book.link.trim() : null,
        }))
        .filter((book: any) => book.id != null && book.image),
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch featured books',
      data: error?.data,
    })
  }
})

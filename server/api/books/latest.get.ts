import { createError, defineEventHandler } from 'h3'

function absoluteUrl(baseUrl: string, raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = String(config.public.payloadBaseUrl || 'http://localhost:3002').replace(/\/+$/, '')
  const payloadServerBearer = String(config.payloadServerBearer || '').trim()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (payloadServerBearer) headers.Authorization = `Bearer ${payloadServerBearer}`

  const params = new URLSearchParams()
  params.set('where[type][equals]', 'book')
  params.set('sort', '-releaseDate,-updatedAt')
  params.set('limit', '200')
  params.set('depth', '2')

  try {
    const res: any = await $fetch(`${payloadBaseUrl}/api/connect-user-publications?${params.toString()}`, { headers })
    const docs = Array.isArray(res?.docs) ? res.docs : []

    return {
      books: docs.map((book: any) => ({
        id: book?.id,
        title: book?.title || 'Untitled',
        link: typeof book?.link === 'string' && book.link.trim() ? book.link.trim() : null,
        image: absoluteUrl(payloadBaseUrl, book?.image?.url),
        releaseDate: book?.releaseDate ? String(book.releaseDate).slice(0, 10) : null,
        author: book?.owner?.name || null,
        type: book?.type || null,
      })),
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch latest books',
      data: error?.data,
    })
  }
})

import { defineEventHandler, getQuery } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

function absoluteUrl(baseUrl: string, raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `${baseUrl}${raw.startsWith('/') ? raw : `/${raw}`}`
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const params = new URLSearchParams()
  params.set('where[type][equals]', 'book')
  params.set('sort', '-releaseDate,-updatedAt')
  params.set('limit', '200')
  params.set('depth', '2')
  if (search) params.set('where[title][like]', search)

  const res = await dashboardPayloadFetch<any>(
    `${auth.payloadBaseUrl}/api/connect-user-publications?${params.toString()}`,
    { event, auth },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch book publications')
  })

  const docs = Array.isArray(res?.docs) ? res.docs : []

  return {
    books: docs.map((book: any) => ({
      id: book?.id,
      title: book?.title || 'Untitled',
      type: book?.type || 'book',
      imageUrl: absoluteUrl(auth.payloadBaseUrl, book?.image?.url),
      ownerName: book?.owner?.name || book?.owner?.email || null,
      releaseDate: book?.releaseDate ? String(book.releaseDate).slice(0, 10) : null,
    })),
  }
})

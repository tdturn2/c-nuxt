import { defineEventHandler } from 'h3'
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
  const params = new URLSearchParams()
  params.set('sort', '-updatedAt')
  params.set('limit', '1')
  params.set('depth', '2')

  const res = await dashboardPayloadFetch<any>(
    `${auth.payloadBaseUrl}/api/connect-settings?${params.toString()}`,
    { event, auth },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch featured publications settings')
  })

  const doc = Array.isArray(res?.docs) ? res.docs[0] || null : null
  const featuredBooks = Array.isArray(doc?.featuredBooks) ? doc.featuredBooks : []

  return {
    doc: doc
      ? {
          id: doc.id,
          name: doc.name || 'Default',
        }
      : null,
    featuredBooks: featuredBooks.map((book: any) => ({
      id: book?.id,
      title: book?.title || 'Untitled',
      type: book?.type || null,
      imageUrl: absoluteUrl(auth.payloadBaseUrl, book?.image?.url),
      ownerName: book?.owner?.name || book?.owner?.email || null,
    })),
  }
})

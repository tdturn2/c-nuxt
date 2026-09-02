import { defineEventHandler, getQuery } from 'h3'
import { toBrowserMediaUrl } from '../../../utils/connectApi'
import { dashboardPayloadFetch, requireDashboardStaff, toProxyError } from '../../../utils/dashboardForms'

function normalizeDoc(doc: any) {
  if (!doc || typeof doc !== 'object') return doc
  const url = toBrowserMediaUrl(doc.url || doc.file?.url) || doc.url || null
  return { ...doc, url, _normalizedUrl: url }
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const query = getQuery(event)
  const params = new URLSearchParams()
  const limit = typeof query.limit === 'string' && /^\d+$/.test(query.limit) ? query.limit : '48'
  const page = typeof query.page === 'string' && /^\d+$/.test(query.page) ? query.page : '1'
  params.set('limit', limit)
  params.set('page', page)
  params.set('sort', '-createdAt')
  const kind = typeof query.kind === 'string' ? query.kind.trim() : ''
  if (kind) params.set('where[kind][equals]', kind)

  try {
    const data: any = await dashboardPayloadFetch(
      `${auth.payloadBaseUrl}/api/connect-user-media?${params.toString()}`,
      { event, auth },
    )
    if (Array.isArray(data?.docs)) {
      return { ...data, docs: data.docs.map(normalizeDoc) }
    }
    return data
  } catch (err: any) {
    throw toProxyError(err, 'Failed to fetch user media')
  }
})

import { defineEventHandler, getQuery } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page || 1))
  const limit = Math.min(100, Math.max(1, Number(query.limit || 50)))
  const owner = typeof query.owner === 'string' ? query.owner.trim() : ''
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('sort', '-releaseDate,-updatedAt')
  params.set('depth', '2')
  if (owner) params.set('where[owner][equals]', owner)
  if (search) params.set('where[title][like]', search)

  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/connect-user-publications?${params.toString()}`,
    { event, auth },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch faculty publications')
  })
})

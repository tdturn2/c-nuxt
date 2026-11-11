import { defineEventHandler, getQuery } from 'h3'
import { dashboardPayloadFetch, requireDashboardAdmin, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const query = getQuery(event)
  const page = Number.parseInt(String(query.page || '1'), 10)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const url = new URL(`${auth.payloadBaseUrl}/api/connect-messages/admin/messages`)
  url.searchParams.set('page', String(Number.isInteger(page) && page > 0 ? page : 1))
  url.searchParams.set('limit', '25')
  if (q) url.searchParams.set('q', q)
  return await dashboardPayloadFetch(url.toString(), { event, auth }).catch((err: any) => {
    throw toProxyError(err, 'Failed to load messages')
  })
})

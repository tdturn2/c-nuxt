import { defineEventHandler, getQuery } from 'h3'
import { dashboardPayloadFetch, requireDashboardAdmin, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const url = new URL(`${auth.payloadBaseUrl}/api/connect-messages/admin/conversations`)
  if (q) url.searchParams.set('q', q)
  return await dashboardPayloadFetch(url.toString(), { event, auth }).catch((err: any) => {
    throw toProxyError(err, 'Failed to search conversations')
  })
})

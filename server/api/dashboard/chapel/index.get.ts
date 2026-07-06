import { defineEventHandler, getQuery } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page || 1))
  const limit = Math.min(100, Math.max(1, Number(query.limit || 50)))

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))
  params.set('sort', '-date,-updatedAt')
  params.set('depth', '1')

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/chapel-podcasts?${params.toString()}`, {
    event,
    auth,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch chapel episodes')
  })
})

import { defineEventHandler, getQuery } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { section: 'chapel' })
  const query = getQuery(event)
  const params = new URLSearchParams()
  params.set('limit', String(Math.min(200, Math.max(1, Number(query.limit || 200)))))
  params.set('page', String(Math.max(1, Number(query.page || 1))))
  params.set('sort', '-startDate')
  if (typeof query.active === 'string' && query.active) params.set('active', query.active)

  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/chapel-calendar-themes?${params.toString()}`,
    { event, auth },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch chapel calendar themes')
  })
})

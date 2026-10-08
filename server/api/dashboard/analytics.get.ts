import { defineEventHandler } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { section: 'analytics' })
  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-analytics/summary`, {
    event,
    auth,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to load analytics')
  })
})

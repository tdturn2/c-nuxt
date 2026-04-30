import { defineEventHandler } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const params = new URLSearchParams()
  params.set('sort', 'name')
  params.set('limit', '200')
  params.set('depth', '0')

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-groups?${params.toString()}`, {
    event,
    auth,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch groups')
  })
})

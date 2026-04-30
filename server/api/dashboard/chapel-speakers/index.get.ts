import { defineEventHandler } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const params = new URLSearchParams()
  params.set('sort', '-updatedAt')
  params.set('pagination', 'false')
  params.set('depth', '1')

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/chapel-speakers?${params.toString()}`, {
    event,
    auth,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch chapel speakers')
  })
})

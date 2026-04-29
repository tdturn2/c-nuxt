import { defineEventHandler } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const headers = getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' })
  const params = new URLSearchParams()
  params.set('sort', '-updatedAt')
  params.set('limit', '200')
  params.set('depth', '1')

  return await $fetch(`${auth.payloadBaseUrl}/api/connect-users?${params.toString()}`, {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch users')
  })
})

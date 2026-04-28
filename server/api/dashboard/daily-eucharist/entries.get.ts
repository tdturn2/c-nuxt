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
  params.set('sort', '-date,-updatedAt')
  params.set('limit', '200')
  params.set('depth', '2')

  return await $fetch(`${auth.payloadBaseUrl}/api/connect-daily-eucharist-entries?${params.toString()}`, {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch Daily Eucharist entries')
  })
})

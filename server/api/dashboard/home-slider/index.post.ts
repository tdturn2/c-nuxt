import { defineEventHandler, readBody } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  return await $fetch(`${auth.payloadBaseUrl}/api/connect-home-slider-items`, {
    method: 'POST',
    headers,
    body,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create home slider item')
  })
})

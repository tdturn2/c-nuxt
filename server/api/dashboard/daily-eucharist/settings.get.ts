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
  params.set('limit', '1')
  params.set('depth', '0')

  const res = await $fetch<any>(`${auth.payloadBaseUrl}/api/connect-settings?${params.toString()}`, {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch Daily Eucharist settings')
  })

  const doc = Array.isArray(res?.docs) ? res.docs[0] || null : null
  return { doc }
})

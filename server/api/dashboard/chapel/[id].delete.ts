import { createError, defineEventHandler, getRouterParam } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  return await $fetch(`${auth.payloadBaseUrl}/api/chapel-podcasts/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to delete chapel episode')
  })
})

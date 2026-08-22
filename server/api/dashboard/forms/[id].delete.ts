import { createError, defineEventHandler, getRouterParam } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-forms/${encodeURIComponent(id)}`, {
    event,
    auth,
    method: 'DELETE',
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to delete form')
  })
})

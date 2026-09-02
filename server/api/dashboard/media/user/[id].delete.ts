import { createError, defineEventHandler, getRouterParam } from 'h3'
import { dashboardPayloadFetch, requireDashboardStaff, toProxyError } from '../../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Media id is required' })
  }
  const auth = await requireDashboardStaff(event)
  try {
    return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-user-media/${encodeURIComponent(id)}`, {
      event,
      auth,
      method: 'DELETE',
    })
  } catch (err: any) {
    throw toProxyError(err, 'Failed to delete user media')
  }
})

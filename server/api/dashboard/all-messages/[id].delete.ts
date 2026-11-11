import { createError, defineEventHandler, getRouterParam } from 'h3'
import { dashboardPayloadFetch, requireDashboardAdmin, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: 'Message not found' })
  }
  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-messages/admin/messages/${id}`, {
    event,
    auth,
    method: 'DELETE',
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to delete message')
  })
})

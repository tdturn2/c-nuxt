import { createError, defineEventHandler, getRouterParam } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)
  const userId = Number.parseInt(getRouterParam(event, 'userId') || '', 10)
  if (!Number.isInteger(userId) || userId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'User is required' })
  }

  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/connect-messages/official-senders/${userId}`,
    {
      event,
      auth,
      method: 'DELETE',
    },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to remove official account')
  })
})

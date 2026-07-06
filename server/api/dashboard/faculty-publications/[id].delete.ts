import { createError, defineEventHandler, getRouterParam } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Publication id is required' })

  const auth = await requireDashboardAdmin(event)

  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/connect-user-publications/${encodeURIComponent(String(id))}`,
    {
      event,
      auth,
      method: 'DELETE',
    },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to delete faculty publication')
  })
})

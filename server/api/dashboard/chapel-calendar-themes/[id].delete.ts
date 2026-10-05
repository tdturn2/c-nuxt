import { createError, defineEventHandler, getRouterParam } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Theme id is required' })

  const auth = await requireDashboardStaff(event, { section: 'chapel' })
  return await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/chapel-calendar-themes/${encodeURIComponent(id)}`,
    { event, auth, method: 'DELETE' },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to delete chapel calendar theme')
  })
})

import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getDashboardPayloadHeaders, requireDashboardStaff, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const { payloadBaseUrl } = auth
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const headers = getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' })

  return await $fetch(`${payloadBaseUrl}/api/connect-forms/${encodeURIComponent(id)}`, {
    headers,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch form')
  })
})

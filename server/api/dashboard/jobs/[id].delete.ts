import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireDashboardStaff, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)

  // SSO-style delete: email query only. No Bearer.
  return await $fetch(`${auth.payloadBaseUrl}/api/connect-jobs/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    query: { email: auth.email },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to delete job')
  })
})

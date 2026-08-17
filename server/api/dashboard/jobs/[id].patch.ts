import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireDashboardStaff, toProxyError } from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  // SSO-style mutate: inject session email; ignore client email spoofing. No Bearer.
  const { email: _ignored, ...data } = body
  return await $fetch(`${auth.payloadBaseUrl}/api/connect-jobs/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { ...data, email: auth.email },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update job')
  })
})

import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { getDashboardPayloadHeaders, requireDashboardStaff, toProxyError, withServerBearer } from '../../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const { payloadBaseUrl } = auth
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  const status = String(body.status ?? '').trim().toLowerCase()
  if (status !== 'active' && status !== 'inactive') {
    throw createError({ statusCode: 400, statusMessage: 'status must be active or inactive' })
  }

  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  return await $fetch(`${payloadBaseUrl}/api/connect-forms/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: { status },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update form status')
  })
})

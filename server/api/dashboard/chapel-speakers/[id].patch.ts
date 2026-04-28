import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  delete body.date
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  return await $fetch(`${auth.payloadBaseUrl}/api/chapel-speakers/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers,
    body,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update chapel speaker')
  })
})

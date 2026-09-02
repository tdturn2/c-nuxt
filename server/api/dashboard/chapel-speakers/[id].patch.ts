import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
} from '../../../utils/dashboardForms'
import { asNullableRelationship } from '../../../utils/payloadRelationship'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event, { section: 'chapel-speakers' })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  delete body.date
  if ('connectUser' in body) body.connectUser = asNullableRelationship(body.connectUser)
  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/chapel-speakers/${encodeURIComponent(String(id))}`, {
    event,
    auth,
    method: 'PATCH',
    body,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update chapel speaker')
  })
})

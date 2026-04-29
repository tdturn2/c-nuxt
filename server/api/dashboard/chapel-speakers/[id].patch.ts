import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

function asNullableRelationship(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const v = value.trim()
    if (!v) return null
    return /^\d+$/.test(v) ? Number(v) : v
  }
  return null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, any>
  delete body.date
  if ('connectUser' in body) body.connectUser = asNullableRelationship(body.connectUser)
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  return await $fetch(`${auth.payloadBaseUrl}/api/chapel-speakers/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers,
    body,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update chapel speaker')
  })
})

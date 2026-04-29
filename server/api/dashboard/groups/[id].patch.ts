import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

function toTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))
  const payloadBody: Record<string, unknown> = {}
  if (body.name !== undefined) payloadBody.name = toTrimmed(body.name)
  if (body.slug !== undefined) payloadBody.slug = toTrimmed(body.slug)
  if (body.description !== undefined) payloadBody.description = toTrimmed(body.description) || null

  return await $fetch(`${auth.payloadBaseUrl}/api/connect-groups/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers,
    body: payloadBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update group')
  })
})

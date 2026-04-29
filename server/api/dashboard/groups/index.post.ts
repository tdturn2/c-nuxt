import { createError, defineEventHandler, readBody } from 'h3'
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
  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const name = toTrimmed(body.name)
  const slug = toTrimmed(body.slug)
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Group name is required' })
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Group slug is required' })

  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))
  return await $fetch(`${auth.payloadBaseUrl}/api/connect-groups`, {
    method: 'POST',
    headers,
    body: {
      name,
      slug,
      description: toTrimmed(body.description) || null,
    },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create group')
  })
})

import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../utils/dashboardForms'

const ALLOWED_ROLES = new Set(['admin', 'faculty', 'staff', 'student', 'alumni'])

function toTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toRoleArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim().toLowerCase())
    .filter((item) => ALLOWED_ROLES.has(item))
}

function toIdArray(value: unknown): Array<string | number> {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) return item
      if (typeof item === 'string' && item.trim()) return item.trim()
      if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as { id?: unknown }).id
        if (typeof id === 'number' && Number.isFinite(id)) return id
        if (typeof id === 'string' && id.trim()) return id.trim()
      }
      return null
    })
    .filter((item): item is string | number => item !== null)
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }))

  const payloadBody: Record<string, unknown> = {}
  if (body.name !== undefined) payloadBody.name = toTrimmed(body.name)
  if (body.email !== undefined) payloadBody.email = toTrimmed(body.email).toLowerCase()
  if (body.roles !== undefined) payloadBody.roles = toRoleArray(body.roles)
  if (body.groups !== undefined) payloadBody.groups = toIdArray(body.groups)
  if (body.avatarConnectUserMedia !== undefined) payloadBody.avatarConnectUserMedia = body.avatarConnectUserMedia
  if (body.password !== undefined) {
    const password = toTrimmed(body.password)
    if (password) payloadBody.password = password
  }

  return await $fetch(`${auth.payloadBaseUrl}/api/connect-users/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers,
    body: payloadBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to update user')
  })
})

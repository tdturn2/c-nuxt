import { createError, defineEventHandler, readBody } from 'h3'
import { randomBytes } from 'node:crypto'
import {
  dashboardPayloadFetch,
  requireDashboardStaff,
  toProxyError,
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
  const auth = await requireDashboardStaff(event)
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const email = toTrimmed(body.email).toLowerCase()
  const name = toTrimmed(body.name)
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Email is required' })

  const password = toTrimmed(body.password) || randomBytes(16).toString('hex')
  const payloadBody = {
    email,
    name,
    employeeTitle: toTrimmed(body.employeeTitle),
    phone: toTrimmed(body.phone),
    password,
    roles: toRoleArray(body.roles),
    groups: toIdArray(body.groups),
    avatarConnectUserMedia: body.avatarConnectUserMedia ?? null,
  }

  return await dashboardPayloadFetch(`${auth.payloadBaseUrl}/api/connect-users`, {
    event,
    auth,
    method: 'POST',
    body: payloadBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to create user')
  })
})

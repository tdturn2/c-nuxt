import { defineEventHandler } from 'h3'
import {
  dashboardPayloadFetch,
  requireDashboardAdmin,
  toProxyError,
} from '../../../utils/dashboardForms'

function hasFacultyRole(roles: unknown): boolean {
  if (!Array.isArray(roles)) return false
  return roles.some((role) => String(role || '').trim().toLowerCase() === 'faculty')
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardAdmin(event)

  const usersParams = new URLSearchParams()
  usersParams.set('sort', 'name,email')
  usersParams.set('limit', '500')
  usersParams.set('depth', '0')

  const pubsParams = new URLSearchParams()
  pubsParams.set('limit', '200')
  pubsParams.set('depth', '1')
  pubsParams.set('sort', '-updatedAt')

  const [usersRes, pubsRes]: any[] = await Promise.all([
    dashboardPayloadFetch(
      `${auth.payloadBaseUrl}/api/connect-users?${usersParams.toString()}`,
      { event, auth },
    ).catch((err: any) => {
      throw toProxyError(err, 'Failed to fetch faculty users')
    }),
    dashboardPayloadFetch(
      `${auth.payloadBaseUrl}/api/connect-user-publications?${pubsParams.toString()}`,
      { event, auth },
    ).catch(() => ({ docs: [] })),
  ])

  const byId = new Map<string, { id: string | number; name: string; email: string }>()

  for (const user of Array.isArray(usersRes?.docs) ? usersRes.docs : []) {
    if (!hasFacultyRole(user?.roles) && !hasFacultyRole(user?.fields?.roles)) continue
    byId.set(String(user.id), {
      id: user.id,
      name: user.name || user.email || `User #${user.id}`,
      email: user.email || '',
    })
  }

  // Ensure current publication authors appear even if not marked faculty.
  for (const pub of Array.isArray(pubsRes?.docs) ? pubsRes.docs : []) {
    const owner = pub?.owner
    if (!owner || typeof owner !== 'object') continue
    const id = String(owner.id || '').trim()
    if (!id || byId.has(id)) continue
    byId.set(id, {
      id: owner.id,
      name: owner.name || owner.email || `User #${owner.id}`,
      email: owner.email || '',
    })
  }

  const docs = [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )

  return { docs }
})

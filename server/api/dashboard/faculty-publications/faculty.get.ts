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
  const params = new URLSearchParams()
  params.set('sort', 'name,email')
  params.set('limit', '500')
  params.set('depth', '0')

  const res: any = await dashboardPayloadFetch(
    `${auth.payloadBaseUrl}/api/connect-users?${params.toString()}`,
    { event, auth },
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to fetch faculty users')
  })

  const docs = (Array.isArray(res?.docs) ? res.docs : [])
    .filter((user: any) => hasFacultyRole(user?.roles) || hasFacultyRole(user?.fields?.roles))
    .map((user: any) => ({
      id: user.id,
      name: user.name || user.email || `User #${user.id}`,
      email: user.email || '',
    }))

  return { docs }
})

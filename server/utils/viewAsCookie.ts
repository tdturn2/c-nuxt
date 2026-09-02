import { createHmac, timingSafeEqual } from 'node:crypto'
import { isRolePreviewRole, type RolePreviewRole } from '../../shared/impersonation'

export const VIEW_AS_COOKIE_NAME = 'connect-view-as'
export const VIEW_AS_TTL_SECONDS = 60 * 60

export type ViewAsCookiePayload = {
  v: 1
  mode: 'role'
  role: RolePreviewRole
  actorEmail: string
  exp: number
}

export function signViewAsCookie(payload: ViewAsCookiePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const mac = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verifyViewAsCookie(token: string, secret: string): ViewAsCookiePayload | null {
  const parts = String(token || '').split('.')
  if (parts.length !== 2) return null
  const [body, mac] = parts
  if (!body || !mac) return null

  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<ViewAsCookiePayload>
    if (parsed?.v !== 1 || parsed.mode !== 'role' || !isRolePreviewRole(parsed.role)) return null
    if (typeof parsed.actorEmail !== 'string' || !parsed.actorEmail.trim()) return null
    if (typeof parsed.exp !== 'number' || parsed.exp * 1000 < Date.now()) return null
    return {
      v: 1,
      mode: 'role',
      role: parsed.role,
      actorEmail: parsed.actorEmail.trim().toLowerCase(),
      exp: parsed.exp,
    }
  } catch {
    return null
  }
}

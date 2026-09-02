import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { applyRolePreview, type RolePreviewRole } from '@shared/impersonation'
import {
  signViewAsCookie,
  verifyViewAsCookie,
  VIEW_AS_COOKIE_NAME,
  VIEW_AS_TTL_SECONDS,
  type ViewAsCookiePayload,
} from './viewAsCookie'

function getViewAsSecret(): string {
  return String(useRuntimeConfig().authSecret || '').trim()
}

function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  }
}

export function clearViewAsCookie(event: H3Event) {
  deleteCookie(event, VIEW_AS_COOKIE_NAME, { path: '/' })
}

export function writeViewAsCookie(event: H3Event, role: RolePreviewRole, actorEmail: string) {
  const secret = getViewAsSecret()
  if (!secret) {
    throw createError({ statusCode: 500, statusMessage: 'Missing AUTH_SECRET' })
  }
  const payload: ViewAsCookiePayload = {
    v: 1,
    mode: 'role',
    role,
    actorEmail: actorEmail.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + VIEW_AS_TTL_SECONDS,
  }
  setCookie(event, VIEW_AS_COOKIE_NAME, signViewAsCookie(payload, secret), cookieOptions(VIEW_AS_TTL_SECONDS))
  return payload
}

export function readViewAsCookie(event: H3Event, sessionEmail: string): ViewAsCookiePayload | null {
  const secret = getViewAsSecret()
  if (!secret) return null
  const raw = getCookie(event, VIEW_AS_COOKIE_NAME)
  if (!raw) return null
  const payload = verifyViewAsCookie(raw, secret)
  const session = String(sessionEmail || '').trim().toLowerCase()
  if (!payload || payload.actorEmail !== session) {
    clearViewAsCookie(event)
    return null
  }
  return payload
}

export function applyImpersonationToUser<T extends Record<string, any> | null | undefined>(
  event: H3Event,
  user: T,
  sessionEmail: string,
): T {
  if (!user || typeof user !== 'object') return user
  const viewAs = readViewAsCookie(event, sessionEmail)
  if (!viewAs) return user
  return applyRolePreview(user, viewAs.role, viewAs.actorEmail) as T
}

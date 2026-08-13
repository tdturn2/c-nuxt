/**
 * Session → connect-api auth (Hono).
 * Syncs the Entra/mobile identity via POST /api/connect-users/sync and returns JWT + optional session cookie.
 * Filename is historical; prefer authenticateWithConnectApi / getConnectApiProxyHeaders in new code.
 */
import { getHeader } from 'h3'
import { verifyMobileAccessToken } from './mobileAuth'

const syncInFlightByEmail = new Map<string, Promise<PayloadAuthResult>>()

export type PayloadAuthResult = {
  token: string | null
  email: string | null
  /** Session cookie from connect-users sync `Set-Cookie` (use on follow-up API calls when JWT is absent). */
  payloadSessionCookie: string | null
}

export type ConnectApiAuthResult = PayloadAuthResult

/** Build headers for server-side connect-api $fetch: Bearer when sync returned JWT, plus session cookie and optional browser cookies. */
export function getPayloadProxyHeaders(
  event: any,
  auth: Pick<PayloadAuthResult, 'token' | 'payloadSessionCookie'>,
  extra?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }
  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }
  const incoming = getHeader(event, 'cookie') || ''
  const parts = [auth.payloadSessionCookie, incoming].filter(Boolean)
  if (parts.length) {
    headers.Cookie = parts.join('; ')
  }
  return headers
}

function setCookieLinesToCookieHeader(setCookieLines: string[]): string | null {
  if (!setCookieLines.length) return null
  const pairs = setCookieLines
    .map((line) => line.split(';')[0]?.trim())
    .filter((p) => p && p.includes('='))
  if (!pairs.length) return null
  return pairs.join('; ')
}

function readSetCookieHeaders(res: { headers: Headers }): string[] {
  const h = res.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof h.getSetCookie === 'function') {
    return h.getSetCookie()
  }
  const single = res.headers.get('set-cookie')
  return single ? [single] : []
}

export async function authenticateWithPayloadCMS(event: any): Promise<PayloadAuthResult> {
  const none = (): PayloadAuthResult => ({ token: null, email: null, payloadSessionCookie: null })

  try {
    const config = useRuntimeConfig()
    const payloadBaseUrl =
      (config.connectApi || config.public.connectApi || '').trim() ||
      (import.meta.dev ? 'http://localhost:3003' : '')

    const syncIntoPayload = async (identity: { email: string; name?: string | null; avatar?: string | null }) => {
      if (!payloadBaseUrl) {
        return { token: null, email: identity.email, payloadSessionCookie: null }
      }
      const emailKey = identity.email.trim().toLowerCase()
      const existing = syncInFlightByEmail.get(emailKey)
      if (existing) return await existing

      const run = (async (): Promise<PayloadAuthResult> => {
        const doSync = async () => {
          const res = await $fetch.raw(`${payloadBaseUrl}/api/connect-users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
              email: identity.email,
              name: identity.name ?? undefined,
              avatar: identity.avatar ?? undefined,
            },
          })

          const syncResponse: any = await res.json().catch(() => null)
          const token = typeof syncResponse?.token === 'string' ? syncResponse.token : null
          const payloadSessionCookie = setCookieLinesToCookieHeader(readSetCookieHeaders(res))
          return { token, payloadSessionCookie }
        }
        try {
          let { token, payloadSessionCookie } = await doSync()
          // Rare race in concurrent dashboard requests: first sync can return authenticated=false.
          // Retry once immediately to recover a valid token/cookie for this request.
          if (!token && !payloadSessionCookie) {
            const second = await doSync().catch(() => ({ token: null, payloadSessionCookie: null }))
            token = second.token
            payloadSessionCookie = second.payloadSessionCookie
          }
          return { token, email: identity.email, payloadSessionCookie }
        } catch (authError) {
          console.error('Error syncing with PayloadCMS:', authError)
          return { token: null, email: identity.email, payloadSessionCookie: null }
        } finally {
          syncInFlightByEmail.delete(emailKey)
        }
      })()
      syncInFlightByEmail.set(emailKey, run)
      return await run
    }

    const base64UrlDecode = (input: string): string | null => {
      try {
        const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
        const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
        return Buffer.from(`${normalized}${pad}`, 'base64').toString('utf8')
      } catch {
        return null
      }
    }

    const parseConnectUserClaims = (
      token: string,
    ): { email: string; collection: string } | null => {
      const parts = token.split('.')
      if (parts.length < 2) return null
      const payloadJson = base64UrlDecode(parts[1])
      if (!payloadJson) return null
      try {
        const payload = JSON.parse(payloadJson) as Record<string, unknown>
        const email = typeof payload.email === 'string' ? payload.email.trim() : ''
        const collection = typeof payload.collection === 'string' ? payload.collection.trim() : ''
        if (!email || collection !== 'connect-users') return null
        return { email, collection }
      } catch {
        return null
      }
    }

    const resolvePayloadIdentityFromBearer = async (bearerToken: string): Promise<PayloadAuthResult | null> => {
      if (!payloadBaseUrl) return null
      try {
        const me: any = await $fetch(`${payloadBaseUrl}/api/connect-users/me`, {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            Accept: 'application/json',
          },
        })
        const email = typeof me?.user?.email === 'string' ? me.user.email.trim() : ''
        if (!email) return null
        return {
          token: bearerToken,
          email,
          payloadSessionCookie: null,
        }
      } catch {
        return null
      }
    }

    // Mobile app support: if Authorization bearer is a Connect mobile token, use claims as identity.
    const authHeader = getHeader(event, 'authorization') || ''
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    if (bearerMatch?.[1]) {
      try {
        const mobileClaims = await verifyMobileAccessToken(bearerMatch[1])
        if (mobileClaims.email) {
          return await syncIntoPayload({
            email: mobileClaims.email,
            name: mobileClaims.name ?? undefined,
          })
        }
      } catch {
        // Not a valid mobile token; continue to payload-bearer/web-session flow.
      }

      // Non-mobile callers may send a valid Payload connect-users JWT directly.
      const payloadIdentity = await resolvePayloadIdentityFromBearer(bearerMatch[1])
      if (payloadIdentity) {
        return payloadIdentity
      }

      // If token shape looks valid but /me fails, re-sync by claims email
      // to mint a fresh connect-users token instead of forwarding stale auth.
      const claims = parseConnectUserClaims(bearerMatch[1])
      if (claims) {
        const refreshed = await syncIntoPayload({ email: claims.email })
        if (refreshed.token || refreshed.payloadSessionCookie) return refreshed
        return none()
      }
    }

    const cookieHeader = getHeader(event, 'cookie') || ''
    const fetchSession = async (path: string) =>
      await event
        .fetch(path, {
          headers: {
            Cookie: cookieHeader,
            Accept: 'application/json',
          },
        })
        .then((r: Response) => r.json())
        .catch(() => null)

    // Prefer auth endpoint, then fallback to /session compatibility route.
    const session: any = (await fetchSession('/api/auth/session')) || (await fetchSession('/session'))

    if (!session?.user?.email) {
      return none()
    }

    return await syncIntoPayload({
      email: session.user.email,
      name: session.user.name ?? undefined,
      avatar: session.user.image ?? undefined,
    })
  } catch (error) {
    console.error('Error getting session for connect-api auth:', error)
    return none()
  }
}

/** Preferred name — same as authenticateWithPayloadCMS. */
export const authenticateWithConnectApi = authenticateWithPayloadCMS

/** Preferred name — same as getPayloadProxyHeaders. */
export const getConnectApiProxyHeaders = getPayloadProxyHeaders

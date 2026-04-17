// Shared utility for authenticating with PayloadCMS using SSO email
import { getHeader } from 'h3'

export type PayloadAuthResult = {
  token: string | null
  email: string | null
  /** First-party Payload session from sync `Set-Cookie` (use on follow-up Payload API calls when JWT is absent). */
  payloadSessionCookie: string | null
}

/** Build headers for server-side Payload $fetch: Bearer when sync returned JWT, plus Payload session cookie and optional browser cookies. */
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
    const cookieHeader = getHeader(event, 'cookie') || ''
    // Get SSO session
    const session: any = await event
      .fetch('/api/auth/session', {
        headers: {
          Cookie: cookieHeader,
          Accept: 'application/json',
        },
      })
      .then((r: Response) => r.json())
      .catch(() => null)

    if (!session?.user?.email) {
      return none()
    }

    const config = useRuntimeConfig()
    const payloadBaseUrl =
      (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
      (import.meta.dev ? 'http://localhost:3002' : '')
    if (!payloadBaseUrl) {
      // In production, avoid forcing localhost fallback and let callers continue with SSO email.
      return { token: null, email: session.user.email, payloadSessionCookie: null }
    }

    // SSO only: call /sync with email (and name/avatar if we have them). Do not call /login (email+password only).
    try {
      const res = await $fetch.raw(`${payloadBaseUrl}/api/connect-users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: session.user.email,
          name: session.user.name ?? undefined,
          avatar: session.user.image ?? undefined,
        },
      })

      const syncResponse: any = await res.json().catch(() => null)

      let token: string | null = null
      if (syncResponse?.token) {
        token = typeof syncResponse.token === 'string' ? syncResponse.token : null
      }

      const payloadSessionCookie = setCookieLinesToCookieHeader(readSetCookieHeaders(res))

      return {
        token,
        email: session.user.email,
        payloadSessionCookie,
      }
    } catch (authError) {
      console.error('Error syncing with PayloadCMS:', authError)
      return { token: null, email: session.user.email, payloadSessionCookie: null }
    }
  } catch (error) {
    console.error('Error getting session for PayloadCMS:', error)
    return none()
  }
}

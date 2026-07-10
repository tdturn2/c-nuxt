import type { H3Event } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from './payloadAuth'

export async function loadConnectUserDocForEvent(event: H3Event): Promise<any | null> {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) return null

  const auth = await authenticateWithPayloadCMS(event)
  if (!auth.email) return null

  const headers = getPayloadProxyHeaders(event, auth, { Accept: 'application/json' })
  const res: any = await $fetch(
    `${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(auth.email)}&limit=1&depth=1`,
    { headers },
  ).catch(() => null)

  return Array.isArray(res?.docs) ? res.docs[0] ?? null : null
}

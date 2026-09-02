import type { H3Event } from 'h3'
import { resolveConnectApiUrl } from './connectApi'
import { authenticateWithConnectApi, getConnectApiProxyHeaders } from './payloadAuth'
import { applyImpersonationToUser } from './impersonation'

export async function loadConnectUserDocForEvent(event: H3Event): Promise<any | null> {
  const payloadBaseUrl = resolveConnectApiUrl()
  if (!payloadBaseUrl) return null

  const auth = await authenticateWithConnectApi(event)
  if (!auth.email) return null

  const headers = getConnectApiProxyHeaders(event, auth, { Accept: 'application/json' })
  const res: any = await $fetch(
    `${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(auth.email)}&limit=1&depth=1`,
    { headers },
  ).catch(() => null)

  const doc = Array.isArray(res?.docs) ? res.docs[0] ?? null : null
  return applyImpersonationToUser(event, doc, auth.email)
}

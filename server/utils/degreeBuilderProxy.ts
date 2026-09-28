/**
 * Degree Builder proxies are SSO/email-style against connect-api.
 * Always send the session email; do not forward a Bearer token (JWT can block SSO auth).
 */
import { createError } from 'h3'
import { authenticateWithConnectApi } from '../utils/payloadAuth'
import { resolveConnectApiUrl } from '../utils/connectApi'

export async function withDegreeBuilderAuth(event: any) {
  const auth = await authenticateWithConnectApi(event)
  if (!auth.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Connect API base URL' })
  }
  return {
    email: auth.email,
    connectApiUrl,
    headers: { 'Content-Type': 'application/json' } as Record<string, string>,
  }
}

export function degreeBuilderError(err: any, fallback: string) {
  console.error(fallback, err)
  if (err?.statusCode) throw err
  throw createError({
    statusCode: err?.statusCode || 500,
    statusMessage: err?.statusMessage || err?.data?.error || fallback,
    data: err?.data,
  })
}

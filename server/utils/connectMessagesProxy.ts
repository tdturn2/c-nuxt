import { createError, getMethod, getQuery, getRouterParam, readBody, type H3Event } from 'h3'
import { toBrowserMediaUrl } from '@shared/mediaUrls'
import { resolveConnectApiUrl } from './connectApi'
import { authenticateWithConnectApi, getConnectApiProxyHeaders } from './payloadAuth'

function rewriteAvatars(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteAvatars(item))
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'avatarUrl') {
      out[key] = typeof child === 'string' ? toBrowserMediaUrl(child) : null
    } else {
      out[key] = rewriteAvatars(child)
    }
  }
  return out
}

export async function proxyConnectMessages(event: H3Event) {
  const auth = await authenticateWithConnectApi(event)
  if (!auth.token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const method = getMethod(event).toUpperCase()
  if (method !== 'GET' && method !== 'POST' && method !== 'DELETE') {
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const raw = getRouterParam(event, 'path')
  const segments = (Array.isArray(raw) ? raw : String(raw || '').split('/')).filter(Boolean)
  if (!segments.length) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const connectApiUrl = resolveConnectApiUrl()
  const upstream = `${connectApiUrl}/api/connect-messages/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`
  const headers = getConnectApiProxyHeaders(event, auth)
  const query = getQuery(event)
  const body = method === 'GET' ? undefined : await readBody(event).catch(() => ({}))

  try {
    const data = await $fetch(upstream, {
      method,
      headers,
      query,
      body,
    })
    return rewriteAvatars(data)
  } catch (err: any) {
    const upstreamError = err?.data?.error
    throw createError({
      statusCode: err?.response?.status || err?.statusCode || 500,
      statusMessage: typeof upstreamError === 'string' ? upstreamError : err?.statusMessage || 'Messenger request failed',
      data: err?.data,
    })
  }
}

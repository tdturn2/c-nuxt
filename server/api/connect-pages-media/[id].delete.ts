import { defineEventHandler, createError, getHeader, getRouterParam, type H3Event } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

function payloadOrigin(raw: string): string {
  let b = raw.trim().replace(/\/+$/, '')
  if (b.endsWith('/api')) b = b.slice(0, -4).replace(/\/+$/, '')
  return b
}

function forwardPayloadHeaders(event: H3Event, token: string | null): Record<string, string> {
  const headers: Record<string, string> = {}
  const cookie = getHeader(event, 'cookie')
  if (cookie) headers.Cookie = cookie
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Asset id is required' })
  }

  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const origin = payloadOrigin(payloadBaseUrl)
  const headers = forwardPayloadHeaders(event, token)
  if (!token && !getHeader(event, 'cookie')) {
    throw createError({
      statusCode: 401,
      statusMessage:
        'No Payload credentials to forward (missing connect-users token and Cookie header).',
    })
  }

  const url = `${origin}/api/connect-pages-media/${encodeURIComponent(id)}`
  const res = await fetch(url, { method: 'DELETE', headers })
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw createError({
      statusCode: res.status,
      statusMessage: res.statusText || 'Failed to delete connect-pages-media',
      data: json,
    })
  }

  return json
})

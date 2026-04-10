import { defineEventHandler, getRouterParam, getQuery, getHeader, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

/** Load one connect-page doc (full `content` Lexical). Forwards session so Payload returns fields editors are allowed to read. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Page id is required' })
  }

  const q = getQuery(event)
  const depth = typeof q.depth === 'string' && q.depth ? q.depth : '2'
  const url = `${payloadBaseUrl}/api/connect-pages/${encodeURIComponent(id)}?depth=${encodeURIComponent(depth)}`

  const { token } = await authenticateWithPayloadCMS(event)
  const headers: Record<string, string> = {}
  const cookie = getHeader(event, 'cookie')
  if (cookie) headers.Cookie = cookie
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await $fetch(url, { headers })
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || err?.message || 'Failed to load connect-page',
      data: err?.data ?? err?.response?._data,
    })
  }
})

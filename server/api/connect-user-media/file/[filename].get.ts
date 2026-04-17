import { createError, defineEventHandler, getHeader, getRouterParam, setHeader } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename) {
    throw createError({ statusCode: 400, statusMessage: 'Filename is required' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const { token, payloadSessionCookie } = await authenticateWithPayloadCMS(event)
  const authHeaders = getPayloadProxyHeaders(event, { token, payloadSessionCookie })
  delete authHeaders['Content-Type']

  const forwardedAccept = getHeader(event, 'accept')
  if (forwardedAccept) authHeaders.Accept = forwardedAccept

  const safeName = encodeURIComponent(filename)
  const candidates = [
    `${payloadBaseUrl}/api/connect-user-media/file/${safeName}`,
    `${payloadBaseUrl}/api/media/file/${safeName}`,
  ]

  let lastStatusCode = 404
  for (const url of candidates) {
    const res = await fetch(url, { headers: authHeaders })
    if (!res.ok) {
      lastStatusCode = res.status
      continue
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const cacheControl = res.headers.get('cache-control') || 'public, max-age=300'
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Cache-Control', cacheControl)
    const disposition = res.headers.get('content-disposition')
    if (disposition) setHeader(event, 'Content-Disposition', disposition)

    const body = Buffer.from(await res.arrayBuffer())
    return body
  }

  throw createError({
    statusCode: lastStatusCode || 404,
    statusMessage: 'Avatar media not found',
  })
})

import { createError, defineEventHandler, getHeader, getRouterParam, setHeader } from 'h3'
import { resolveConnectApiUrl } from '../../../utils/connectApi'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')
  if (!filename) {
    throw createError({ statusCode: 400, statusMessage: 'Filename is required' })
  }

  const payloadBaseUrl = resolveConnectApiUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  const forwardedAccept = getHeader(event, 'accept')
  const headers: Record<string, string> = {}
  if (forwardedAccept) headers.Accept = forwardedAccept

  const url = `${payloadBaseUrl}/api/speaker-photos/file/${encodeURIComponent(filename)}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw createError({
      statusCode: res.status || 404,
      statusMessage: 'Speaker photo not found',
    })
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  const cacheControl = res.headers.get('cache-control') || 'public, max-age=300'
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', cacheControl)
  const disposition = res.headers.get('content-disposition')
  if (disposition) setHeader(event, 'Content-Disposition', disposition)
  event.node.res.removeHeader('x-frame-options')
  setHeader(event, 'Cross-Origin-Resource-Policy', 'cross-origin')

  return Buffer.from(await res.arrayBuffer())
})

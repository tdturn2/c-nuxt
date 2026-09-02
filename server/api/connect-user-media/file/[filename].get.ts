import { Readable } from 'node:stream'
import { createError, defineEventHandler, getHeader, getRouterParam, sendStream, setHeader } from 'h3'
import { resolveConnectApiUrl } from '../../../utils/connectApi'

const FILE_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'

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

  const safeName = encodeURIComponent(filename)
  const candidates = [
    `${payloadBaseUrl}/api/connect-user-media/file/${safeName}`,
    `${payloadBaseUrl}/api/media/file/${safeName}`,
  ]

  let lastStatusCode = 404
  for (const url of candidates) {
    const res = await fetch(url, { headers })
    if (!res.ok) {
      lastStatusCode = res.status
      continue
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Cache-Control', FILE_CACHE)
    const length = res.headers.get('content-length')
    if (length) setHeader(event, 'Content-Length', length)
    const disposition = res.headers.get('content-disposition')
    if (disposition) setHeader(event, 'Content-Disposition', disposition)
    event.node.res.removeHeader('x-frame-options')
    setHeader(event, 'Cross-Origin-Resource-Policy', 'cross-origin')

    if (res.body) {
      return sendStream(event, Readable.fromWeb(res.body as import('stream/web').ReadableStream))
    }
    return Buffer.from(await res.arrayBuffer())
  }

  throw createError({
    statusCode: lastStatusCode || 404,
    statusMessage: 'Avatar media not found',
  })
})

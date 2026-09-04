import { Readable } from 'node:stream'
import { createError, defineEventHandler, getHeader, getRouterParam, sendStream, setHeader } from 'h3'
import { resolveConnectApiUrl } from '../../../../utils/connectApi'

const FILE_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'

export default defineEventHandler(async (event) => {
  const year = getRouterParam(event, 'year')
  const filename = getRouterParam(event, 'filename')
  if (!year || !/^\d{4}$/.test(year)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid year is required' })
  }
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

  const url = `${payloadBaseUrl}/api/degree-plans/file/${encodeURIComponent(year)}/${encodeURIComponent(filename)}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw createError({
      statusCode: res.status || 404,
      statusMessage: 'Degree plan PDF not found',
    })
  }

  const contentType = res.headers.get('content-type') || 'application/pdf'
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
})

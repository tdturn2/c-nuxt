import { createHash } from 'node:crypto'
import { createError, getHeader, getQuery, setHeader, setResponseStatus, type H3Event } from 'h3'
import sharp from 'sharp'

const CACHE_CONTROL = 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400'
const MAX_ENTRIES = 120

type CachedFile = {
  body: Buffer
  contentType: string
  etag: string
}

const memory = new Map<string, CachedFile>()

function remember(key: string, value: CachedFile) {
  if (memory.has(key)) memory.delete(key)
  memory.set(key, value)
  while (memory.size > MAX_ENTRIES) {
    const oldest = memory.keys().next().value
    if (oldest == null) break
    memory.delete(oldest)
  }
}

function requestedWidth(event: H3Event): number {
  const raw = Number(getQuery(event).w)
  if (!Number.isFinite(raw)) return 0
  return Math.min(2000, Math.max(32, Math.round(raw)))
}

function canResize(contentType: string, filename: string): boolean {
  if (/^image\/(jpeg|png|webp)$/i.test(contentType)) return true
  return /\.(?:jpe?g|png|webp)$/i.test(filename)
}

async function toDisplaySize(body: Buffer, width: number, contentType: string, filename: string) {
  if (!width || !canResize(contentType, filename)) {
    return { body, contentType }
  }
  try {
    const resized = await sharp(body, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 76 })
      .toBuffer()
    return { body: resized, contentType: 'image/webp' }
  } catch {
    return { body, contentType }
  }
}

/**
 * Fetch a public media file, optionally resize it, and keep the bytes in memory.
 * Repeat requests for the same file and width are served from that cache.
 */
export async function proxyCachedMediaFile(event: H3Event, upstreamUrls: string[], filename: string) {
  const width = requestedWidth(event)
  const cacheKey = `${filename}|${width}`
  const cached = memory.get(cacheKey)
  const etag = cached?.etag || `W/"${cacheKey}"`

  setHeader(event, 'Cache-Control', CACHE_CONTROL)
  setHeader(event, 'ETag', etag)
  setHeader(event, 'Cross-Origin-Resource-Policy', 'cross-origin')
  event.node.res.removeHeader('x-frame-options')

  if (cached && getHeader(event, 'if-none-match') === cached.etag) {
    setResponseStatus(event, 304)
    return null
  }
  if (cached) {
    setHeader(event, 'Content-Type', cached.contentType)
    setHeader(event, 'Content-Length', String(cached.body.length))
    setHeader(event, 'X-Media-Cache', 'HIT')
    return cached.body
  }

  let lastStatus = 404
  for (const url of upstreamUrls) {
    const res = await fetch(url)
    if (!res.ok) {
      lastStatus = res.status
      continue
    }
    const upstreamType = res.headers.get('content-type') || 'application/octet-stream'
    const original = Buffer.from(await res.arrayBuffer())
    const display = await toDisplaySize(original, width, upstreamType, filename)
    const digest = createHash('sha1').update(display.body).digest('hex').slice(0, 16)
    const stored: CachedFile = {
      body: display.body,
      contentType: display.contentType,
      etag: `W/"${digest}"`,
    }
    remember(cacheKey, stored)
    setHeader(event, 'ETag', stored.etag)
    setHeader(event, 'Content-Type', stored.contentType)
    setHeader(event, 'Content-Length', String(stored.body.length))
    setHeader(event, 'X-Media-Cache', 'MISS')
    return stored.body
  }

  throw createError({
    statusCode: lastStatus || 404,
    statusMessage: 'Media file not found',
  })
}

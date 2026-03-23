import { createError } from 'h3'
import dns from 'node:dns/promises'
import net from 'node:net'

export type LinkPreviewData = {
  url: string
  title: string
  description: string
  image: string | null
  siteName: string
}

const PREVIEW_TIMEOUT_MS = 5000
const MAX_HTML_BYTES = 512_000
const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000

type CachedPreview = {
  data: LinkPreviewData | null
  fetchedAt: number
}

const isPrivateIPv4 = (ip: string) => {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true
  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 0) return true
  return false
}

const isPrivateIPv6 = (ip: string) => {
  const normalized = ip.toLowerCase()
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')
}

const ensurePublicHost = async (hostname: string) => {
  const addresses = await dns.lookup(hostname, { all: true })
  if (!addresses.length) {
    throw createError({ statusCode: 400, statusMessage: 'Unable to resolve host' })
  }
  for (const addr of addresses) {
    if ((addr.family === 4 && isPrivateIPv4(addr.address)) || (addr.family === 6 && isPrivateIPv6(addr.address))) {
      throw createError({ statusCode: 400, statusMessage: 'Private network URLs are not allowed' })
    }
  }
}

const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const readMeta = (html: string, keys: string[]) => {
  for (const key of keys) {
    const escapedKey = escapeRegExp(key)
    const patterns = [
      // <meta property="og:image" content="...">
      new RegExp(`<meta[^>]*(?:property|name)=["']${escapedKey}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'),
      // <meta content="..." property="og:image">
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapedKey}["'][^>]*>`, 'i')
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (!match) continue
      const value = match[1]
      if (value) return decodeHtml(value)
    }
  }
  return ''
}

const readTitle = (html: string) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match?.[1] ? decodeHtml(match[1]) : ''
}

const normalizeUrl = (rawUrl: string): URL => {
  const parsed = new URL(rawUrl)
  parsed.hash = ''
  return parsed
}

export const extractFirstPreviewUrlFromLexical = (content: any): string | null => {
  const urlRegex = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
  const walk = (children: any[]): string[] => {
    const urls: string[] = []
    for (const child of children || []) {
      if (child?.type === 'autolink' && typeof child?.fields?.url === 'string') {
        urls.push(child.fields.url)
      }
      if (child?.type === 'text' && typeof child?.text === 'string') {
        const matches = child.text.match(urlRegex)
        if (matches?.length) urls.push(...matches)
      }
      if (Array.isArray(child?.children)) {
        urls.push(...walk(child.children))
      }
    }
    return urls
  }

  const urls = walk(content?.root?.children || [])
  const previewUrl = urls.find((url) => !(url.includes('youtube.com') || url.includes('youtu.be')))
  return previewUrl || null
}

export const fetchAndCacheLinkPreview = async (rawUrl: string): Promise<LinkPreviewData | null> => {
  if (!rawUrl) return null

  let parsed: URL
  try {
    parsed = normalizeUrl(rawUrl)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid URL' })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'Only HTTP(S) URLs are supported' })
  }
  if (net.isIP(parsed.hostname)) {
    if (isPrivateIPv4(parsed.hostname) || isPrivateIPv6(parsed.hostname)) {
      throw createError({ statusCode: 400, statusMessage: 'Private network URLs are not allowed' })
    }
  } else {
    await ensurePublicHost(parsed.hostname)
  }

  const cache = useStorage('cache')
  const cacheKey = `link-preview:${parsed.toString()}`
  const cached = await cache.getItem<CachedPreview>(cacheKey)
  const now = Date.now()
  if (cached && now - cached.fetchedAt < PREVIEW_TTL_MS) {
    return cached.data
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS)
  try {
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'ConnectLinkPreviewBot/1.0 (+https://connect.asburyseminary.edu)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
    if (!response.ok) {
      throw createError({ statusCode: 502, statusMessage: `Failed to fetch URL (${response.status})` })
    }
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      throw createError({ statusCode: 415, statusMessage: 'URL does not return HTML content' })
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES)
    const ogTitle = readMeta(html, ['og:title', 'twitter:title'])
    const ogDescription = readMeta(html, ['og:description', 'twitter:description', 'description'])
    const ogImage = readMeta(html, ['og:image', 'twitter:image'])
    const ogSiteName = readMeta(html, ['og:site_name'])
    const imageUrl = (() => {
      if (!ogImage) return null
      try {
        return new URL(ogImage, parsed.origin).toString()
      } catch {
        return null
      }
    })()

    const data: LinkPreviewData = {
      url: parsed.toString(),
      title: ogTitle || readTitle(html) || parsed.hostname,
      description: ogDescription || '',
      image: imageUrl,
      siteName: ogSiteName || parsed.hostname
    }
    await cache.setItem(cacheKey, { data, fetchedAt: now })
    return data
  } catch (error: any) {
    if (error?.statusCode) throw error
    if (error?.name === 'AbortError') {
      throw createError({ statusCode: 504, statusMessage: 'Link preview request timed out' })
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate link preview',
      data: error?.message || null
    })
  } finally {
    clearTimeout(timeout)
  }
}

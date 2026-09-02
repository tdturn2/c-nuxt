// Proxy list for Payload connect-pages-media (page assets library).
import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { authenticateWithPayloadCMS } from '../utils/payloadAuth'
import { toBrowserMediaUrl } from '../utils/connectApi'

function payloadOrigin(raw: string): string {
  let b = raw.trim().replace(/\/+$/, '')
  if (b.endsWith('/api')) b = b.slice(0, -4).replace(/\/+$/, '')
  return b
}

function toSameOriginPagesMediaUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const browser = toBrowserMediaUrl(value)
  return browser ?? value
}

function normalizeFileField(file: any): any {
  if (!file || typeof file !== 'object') return file
  const out = { ...file }
  if (typeof out.url === 'string') out.url = toSameOriginPagesMediaUrl(out.url) as string
  return out
}

function isImageMediaDoc(doc: any): boolean {
  const mime = String(doc?.mimeType || doc?.file?.mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return true
  const name = String(doc?.filename || doc?.file?.filename || doc?.file?.name || '')
  return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(name)
}

function normalizeMediaDoc(doc: any) {
  if (!doc || typeof doc !== 'object') return doc
  const next = { ...doc }
  if (next.file != null) next.file = normalizeFileField(next.file)
  const rawUrl =
    typeof next.file?.url === 'string'
      ? next.file.url
      : typeof next.url === 'string'
        ? next.url
        : null
  const url = typeof rawUrl === 'string' ? (toSameOriginPagesMediaUrl(rawUrl) as string) : null
  if (typeof next.url === 'string') next.url = toSameOriginPagesMediaUrl(next.url) as string
  return { ...next, _normalizedUrl: url }
}

export default defineEventHandler(async (event) => {
  const { email, token } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.connectApi || config.public.connectApi || '').trim() ||
    (import.meta.dev ? 'http://localhost:3003' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  const origin = payloadOrigin(payloadBaseUrl)
  const query = getQuery(event)
  const searchParams = new URLSearchParams(query as Record<string, string>)
  const url = `${origin}/api/connect-pages-media?${searchParams.toString()}`

  const headers: Record<string, string> = {}
  const cookie = getHeader(event, 'cookie')
  if (cookie) headers.Cookie = cookie
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const data: any = await $fetch(url, { headers })
    if (Array.isArray(data?.docs)) {
      const kind = String(Array.isArray(query.kind) ? query.kind[0] : query.kind || '').toLowerCase()
      const docs = data.docs
        .map((doc: any) => normalizeMediaDoc(doc))
        .filter((doc: any) => (kind === 'image' || kind === 'images' ? isImageMediaDoc(doc) : true))
      return { ...data, docs }
    }
    return normalizeMediaDoc(data)
  } catch (err: any) {
    const statusCode = err?.response?.status || err?.statusCode || 502
    const errData = err?.data
    throw createError({
      statusCode,
      statusMessage: err?.statusMessage || err?.message || 'Failed to fetch connect-pages-media',
      data: errData,
    })
  }
})

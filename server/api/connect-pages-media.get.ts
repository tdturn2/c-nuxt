// Proxy list for Payload connect-pages-media (page assets library).
import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { authenticateWithPayloadCMS } from '../utils/payloadAuth'

function payloadOrigin(raw: string): string {
  let b = raw.trim().replace(/\/+$/, '')
  if (b.endsWith('/api')) b = b.slice(0, -4).replace(/\/+$/, '')
  return b
}

function toAbsoluteUrl(payloadBaseUrl: string, value: unknown): unknown {
  if (!payloadBaseUrl) return value
  if (typeof value !== 'string') return value
  const v = value.trim()
  if (!v || v.startsWith('http')) return v
  return v.startsWith('/') ? `${payloadBaseUrl}${v}` : `${payloadBaseUrl}/${v}`
}

function normalizeFileField(payloadBaseUrl: string, file: any): any {
  if (!file || typeof file !== 'object') return file
  const out = { ...file }
  if (typeof out.url === 'string') out.url = toAbsoluteUrl(payloadBaseUrl, out.url) as string
  return out
}

function normalizeMediaDoc(payloadBaseUrl: string, doc: any) {
  if (!doc || typeof doc !== 'object') return doc
  const next = { ...doc }
  if (next.file != null) next.file = normalizeFileField(payloadBaseUrl, next.file)
  const url =
    typeof next.file?.url === 'string'
      ? next.file.url
      : typeof next.url === 'string'
        ? (toAbsoluteUrl(payloadBaseUrl, next.url) as string)
        : null
  return { ...next, _normalizedUrl: url }
}

export default defineEventHandler(async (event) => {
  const { email, token } = await authenticateWithPayloadCMS(event)
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
      return {
        ...data,
        docs: data.docs.map((doc: any) => normalizeMediaDoc(origin, doc)),
      }
    }
    return normalizeMediaDoc(origin, data)
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

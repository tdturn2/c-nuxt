import { defineEventHandler, readMultipartFormData, createError, getHeader, type H3Event } from 'h3'
import { humanizeFilename } from '@shared/humanizeFilename'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

/** Forward Connect cookies + connect-users JWT so Payload does not treat the request as anonymous. */
function payloadRequestHeaders(event: H3Event, token: string | null): Record<string, string> {
  const headers: Record<string, string> = {}
  const cookie = getHeader(event, 'cookie')
  if (cookie) headers.Cookie = cookie
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function payloadOrigin(raw: string): string {
  let b = raw.trim().replace(/\/+$/, '')
  if (b.endsWith('/api')) b = b.slice(0, -4).replace(/\/+$/, '')
  return b
}

function absoluteUrl(payloadBaseUrl: string, value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const v = value.trim()
  if (!v) return null
  if (v.startsWith('http')) return v
  const origin = payloadOrigin(payloadBaseUrl)
  return v.startsWith('/') ? `${origin}${v}` : `${origin}/${v}`
}

function pickUrlFromPayload(payloadBaseUrl: string, json: any): { id: unknown; filename: string; url: string | null } {
  const doc = json?.doc ?? json
  const id = doc?.id ?? json?.id
  const file = doc?.file
  const filename =
    (typeof file?.filename === 'string' && file.filename) ||
    (typeof file?.name === 'string' && file.name) ||
    (typeof doc?.filename === 'string' && doc.filename) ||
    'upload'
  const rawUrl =
    (typeof file?.url === 'string' && file.url) ||
    (typeof doc?.url === 'string' && doc.url) ||
    null
  return {
    id,
    filename,
    url: absoluteUrl(payloadBaseUrl, rawUrl),
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const origin = payloadOrigin(payloadBaseUrl)

  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in to upload' })
  }

  const formData = await readMultipartFormData(event)
  const file = formData?.find((field) => field.name === 'file')

  if (!file || !file.data || file.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'File is required' })
  }

  // Collection has no title field; use `alt` as the human-readable label (accessibility + dashboard list).
  const explicitAlt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()
  const originalName = file.filename || 'upload'
  const resolvedAlt = explicitAlt || humanizeFilename(originalName)

  const fd = new FormData()
  const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
  fd.append('file', blob, originalName)
  fd.append('_payload', JSON.stringify({ alt: resolvedAlt }))

  const headers = payloadRequestHeaders(event, token)
  if (!token && !getHeader(event, 'cookie')) {
    throw createError({
      statusCode: 401,
      statusMessage:
        'No Payload credentials to forward (missing connect-users token and Cookie header). Ensure /api/connect-users/sync returns a token or Payload session cookies are sent to Connect.',
    })
  }

  const res = await fetch(`${origin}/api/connect-pages-media`, {
    method: 'POST',
    headers,
    body: fd,
  })
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw createError({
      statusCode: res.status,
      statusMessage: res.statusText || 'Failed to upload connect-pages-media',
      data: json,
    })
  }

  const { id, filename, url } = pickUrlFromPayload(payloadBaseUrl, json)

  if (!url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Upload succeeded but no file URL was returned',
      data: json,
    })
  }

  return { id, filename, url }
})

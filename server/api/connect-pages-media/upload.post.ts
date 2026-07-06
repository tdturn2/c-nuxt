import { defineEventHandler, readMultipartFormData, createError, type H3Event } from 'h3'
import { humanizeFilename } from '@shared/humanizeFilename'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
} from '../../utils/dashboardForms'

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

function multipartHeaders(headers: Record<string, string>): Record<string, string> {
  const next = { ...headers }
  delete next['Content-Type']
  return next
}

async function postConnectPagesMedia(
  event: H3Event,
  uploadUrl: string,
  body: FormData,
  headers: Record<string, string>,
) {
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: multipartHeaders(headers),
    body,
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event)
  const config = useRuntimeConfig()
  const serverBearer = String(config.payloadServerBearer || '').trim()
  const payloadBaseUrl = auth.payloadBaseUrl

  const formData = await readMultipartFormData(event)
  const file = formData?.find((field) => field.name === 'file')

  if (!file || !file.data || file.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'File is required' })
  }

  const explicitAlt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()
  const originalName = file.filename || 'upload'
  const resolvedAlt = explicitAlt || humanizeFilename(originalName)

  const fd = new FormData()
  const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
  fd.append('file', blob, originalName)
  fd.append('_payload', JSON.stringify({ alt: resolvedAlt }))

  const uploadUrl = `${payloadBaseUrl}/api/connect-pages-media`
  const attempts: Array<{ label: string; headers: Record<string, string> }> = [
    {
      label: 'dashboard-token',
      headers: getDashboardPayloadHeaders(event, auth, {}),
    },
  ]

  if (serverBearer) {
    attempts.push({
      label: 'server-bearer',
      headers: { Authorization: `Bearer ${serverBearer}` },
    })
  }

  let lastStatus = 403
  let lastJson: any = {}

  for (const attempt of attempts) {
    const { res, json } = await postConnectPagesMedia(event, uploadUrl, fd, attempt.headers)
    if (res.ok) {
      const { id, filename, url } = pickUrlFromPayload(payloadBaseUrl, json)
      if (!url) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Upload succeeded but no file URL was returned',
          data: json,
        })
      }
      return { id, filename, url }
    }

    lastStatus = res.status
    lastJson = json
    if (res.status !== 403) {
      throw createError({
        statusCode: res.status,
        statusMessage: res.statusText || 'Failed to upload connect-pages-media',
        data: json,
      })
    }
  }

  const refreshed = await authenticateWithPayloadCMS(event).catch(() => null)
  if (refreshed?.token || refreshed?.payloadSessionCookie) {
    const { res, json } = await postConnectPagesMedia(
      event,
      uploadUrl,
      fd,
      getDashboardPayloadHeaders(event, {
        token: refreshed.token,
        payloadSessionCookie: refreshed.payloadSessionCookie,
      }, {}),
    )
    if (res.ok) {
      const { id, filename, url } = pickUrlFromPayload(payloadBaseUrl, json)
      if (!url) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Upload succeeded but no file URL was returned',
          data: json,
        })
      }
      return { id, filename, url }
    }
    lastStatus = res.status
    lastJson = json
  }

  throw createError({
    statusCode: lastStatus || 403,
    statusMessage: lastJson?.errors?.[0]?.message || 'Failed to upload connect-pages-media',
    data: {
      ...lastJson,
      hint: serverBearer
        ? 'Payload rejected both dashboard token and PAYLOAD_SERVER_BEARER for connect-pages-media create. Ensure PAYLOAD_SERVER_BEARER is a valid Payload admin (users collection) API token.'
        : 'Payload rejected dashboard token for connect-pages-media create. Set PAYLOAD_SERVER_BEARER on Vercel to a Payload admin (users collection) API token.',
      hasServerBearer: Boolean(serverBearer),
      attempts: attempts.map((attempt) => attempt.label),
    },
  })
})

import { createError, defineEventHandler, readBody } from 'h3'
import { humanizeFilename } from '@shared/humanizeFilename'
import { requireDashboardStaff, getDashboardPayloadHeaders, toProxyError } from '../../utils/dashboardForms'
import { toBrowserMediaUrl } from '../../utils/connectApi'

function pickUrlFromPayload(json: any): { id: unknown; filename: string; url: string | null } {
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
    (filename ? `/api/connect-pages-media/file/${encodeURIComponent(filename)}` : null)
  return {
    id,
    filename,
    url: toBrowserMediaUrl(rawUrl),
  }
}

function upstreamMessage(err: any): string | null {
  const data = err?.data ?? err?.response?._data
  if (typeof data?.error === 'string' && data.error.trim()) return data.error.trim()
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim()
  return null
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { pageAssets: true })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const explicitAlt = typeof body.alt === 'string' ? body.alt.trim() : ''
  const originalName =
    typeof body.originalFilename === 'string' && body.originalFilename.trim()
      ? body.originalFilename.trim()
      : typeof body.filename === 'string'
        ? body.filename
        : ''

  try {
    const json: any = await $fetch(`${auth.payloadBaseUrl}/api/connect-pages-media/complete`, {
      method: 'POST',
      headers: getDashboardPayloadHeaders(event, auth),
      body: {
        filename: body.filename,
        contentType: body.contentType,
        alt: explicitAlt || humanizeFilename(originalName),
        email: auth.email,
      },
    })
    const { id, filename, url } = pickUrlFromPayload(json)
    if (!url) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Upload succeeded but no file URL was returned',
        data: json,
      })
    }
    return { id, filename, url }
  } catch (err: any) {
    if (err?.statusCode && err?.statusMessage === 'Upload succeeded but no file URL was returned') throw err
    const message = upstreamMessage(err)
    if (message) {
      throw createError({
        statusCode: err?.statusCode || err?.status || 500,
        statusMessage: message,
        data: err?.data,
      })
    }
    if (err?.statusCode) throw err
    throw toProxyError(err, 'Failed to finalize page asset upload')
  }
})

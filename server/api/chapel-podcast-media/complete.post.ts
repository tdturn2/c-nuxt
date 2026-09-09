import { createError, defineEventHandler, readBody } from 'h3'
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
    (filename ? `/api/chapel-podcast-media/file/${encodeURIComponent(filename)}` : null)
  return {
    id,
    filename,
    url: toBrowserMediaUrl(rawUrl),
  }
}

export default defineEventHandler(async (event) => {
  const auth = await requireDashboardStaff(event, { section: 'chapel' })
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>

  try {
    const json: any = await $fetch(`${auth.payloadBaseUrl}/api/chapel-podcast-media/complete`, {
      method: 'POST',
      headers: getDashboardPayloadHeaders(event, auth),
      body: {
        ...body,
        email: auth.email,
      },
    })
    const { id, filename, url } = pickUrlFromPayload(json)
    if (!url) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Upload completed but no file URL was returned',
        data: json,
      })
    }
    return { id, filename, url, _feed: json?._feed }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw toProxyError(err, 'Failed to finalize chapel MP3 upload')
  }
})

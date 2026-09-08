import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requireDashboardStaff, toProxyError } from '../../utils/dashboardForms'
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

  const formData = await readMultipartFormData(event)
  const file = formData?.find((field) => field.name === 'file')
  if (!file || !file.data || file.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'File is required' })
  }

  if ((file.type || '').toLowerCase() !== 'audio/mpeg' && !String(file.filename || '').toLowerCase().endsWith('.mp3')) {
    throw createError({ statusCode: 400, statusMessage: 'Only MP3 files are allowed' })
  }

  const originalName = file.filename || 'upload.mp3'
  const dateField = formData?.find((field) => field.name === 'date')?.data?.toString('utf-8')?.trim() || ''
  const fd = new FormData()
  const blob = new Blob([file.data], { type: file.type || 'audio/mpeg' })
  fd.append('file', blob, originalName)
  fd.append('email', auth.email)
  if (dateField) fd.append('date', dateField)
  fd.append('_payload', JSON.stringify({ email: auth.email, ...(dateField ? { date: dateField } : {}) }))

  try {
    const res = await fetch(`${auth.payloadBaseUrl}/api/chapel-podcast-media`, {
      method: 'POST',
      body: fd,
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw createError({
        statusCode: res.status,
        statusMessage:
          json?.error || json?.errors?.[0]?.message || res.statusText || 'Failed to upload chapel podcast media',
        data: json,
      })
    }

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
    if (err?.statusCode) throw err
    throw toProxyError(err, 'Failed to upload chapel podcast media')
  }
})

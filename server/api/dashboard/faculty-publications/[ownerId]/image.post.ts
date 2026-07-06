import { createError, defineEventHandler, getRouterParam, readMultipartFormData } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardAdmin,
  toProxyError,
  withServerBearer,
} from '../../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const ownerIdParam = getRouterParam(event, 'ownerId')
  if (!ownerIdParam) throw createError({ statusCode: 400, statusMessage: 'ownerId is required' })

  const ownerId = /^\d+$/.test(String(ownerIdParam)) ? Number.parseInt(String(ownerIdParam), 10) : Number.NaN
  if (!Number.isFinite(ownerId) || ownerId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid faculty owner id' })
  }

  const auth = await requireDashboardAdmin(event)

  await fetch(`${auth.payloadBaseUrl}/api/connect-users/${encodeURIComponent(String(ownerId))}?depth=0`, {
    headers: withServerBearer(getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' })),
  }).then(async (res) => {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw createError({
        statusCode: res.status,
        statusMessage: 'Faculty user not found',
        data,
      })
    }
  }).catch((err: any) => {
    if (err?.statusCode) throw err
    throw toProxyError(err, 'Faculty user not found')
  })

  const formData = await readMultipartFormData(event)
  const file = formData?.find((field) => field.name === 'file')
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Image file is required' })
  }

  const alt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, {}))
  delete headers['Content-Type']

  const uploadBody = new FormData()
  const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
  uploadBody.append('file', blob, file.filename || 'publication-cover')
  const payloadData: Record<string, unknown> = {
    owner: ownerId,
    kind: 'pubs-images',
  }
  if (alt) payloadData.alt = alt
  uploadBody.append('_payload', JSON.stringify(payloadData))

  const uploadResponse = await fetch(`${auth.payloadBaseUrl}/api/connect-user-media`, {
    method: 'POST',
    headers,
    body: uploadBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to upload publication image')
  })

  const uploadJson = await uploadResponse.json().catch(() => ({}))
  if (!uploadResponse.ok) {
    throw createError({
      statusCode: uploadResponse.status,
      statusMessage: uploadResponse.statusText || 'Failed to upload publication image',
      data: uploadJson,
    })
  }

  const uploadedIdRaw = uploadJson?.id ?? uploadJson?.doc?.id
  const uploadedId = typeof uploadedIdRaw === 'string' ? Number.parseInt(uploadedIdRaw, 10) : uploadedIdRaw
  if (!uploadedId || Number.isNaN(uploadedId)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Upload succeeded but no media id was returned',
      data: uploadJson,
    })
  }

  const rawUrl = uploadJson?.url ?? uploadJson?.doc?.url
  const url = typeof rawUrl === 'string' && rawUrl.length
    ? (rawUrl.startsWith('http') ? rawUrl : `${auth.payloadBaseUrl}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`)
    : null

  return { id: uploadedId, url }
})

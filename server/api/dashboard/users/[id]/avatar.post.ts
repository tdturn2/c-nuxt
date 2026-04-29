import { createError, defineEventHandler, getRouterParam, readMultipartFormData } from 'h3'
import {
  getDashboardPayloadHeaders,
  requireDashboardStaff,
  toProxyError,
  withServerBearer,
} from '../../../../utils/dashboardForms'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const auth = await requireDashboardStaff(event)
  const formData = await readMultipartFormData(event)
  const file = formData?.find((field) => field.name === 'avatar') || formData?.find((field) => field.name === 'file')
  if (!file || !file.data || file.data.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Avatar file is required (multipart field name: avatar or file)',
    })
  }

  const alt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()
  const headers = withServerBearer(getDashboardPayloadHeaders(event, auth, {}))
  delete headers['Content-Type']

  const uploadBody = new FormData()
  const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
  uploadBody.append('file', blob, file.filename || 'avatar')
  const payloadData: Record<string, unknown> = {
    owner: String(id),
    kind: 'avatars',
  }
  if (alt) payloadData.alt = alt
  uploadBody.append('_payload', JSON.stringify(payloadData))

  const uploadResponse = await fetch(`${auth.payloadBaseUrl}/api/connect-user-media`, {
    method: 'POST',
    headers,
    body: uploadBody,
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to upload avatar media')
  })

  const uploadJson = await uploadResponse.json().catch(() => ({}))
  if (!uploadResponse.ok) {
    throw createError({
      statusCode: uploadResponse.status,
      statusMessage: uploadResponse.statusText || 'Failed to upload avatar media',
      data: uploadJson,
    })
  }

  const uploadedIdRaw = uploadJson?.id ?? uploadJson?.doc?.id
  const uploadedId = typeof uploadedIdRaw === 'string' ? parseInt(uploadedIdRaw, 10) : uploadedIdRaw
  if (!uploadedId || Number.isNaN(uploadedId)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Upload succeeded but no media id was returned',
      data: uploadJson,
    })
  }

  const patchHeaders = withServerBearer(
    getDashboardPayloadHeaders(event, auth, { 'Content-Type': 'application/json' }),
  )

  return await $fetch(`${auth.payloadBaseUrl}/api/connect-users/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    headers: patchHeaders,
    body: { avatarConnectUserMedia: uploadedId },
  }).catch((err: any) => {
    throw toProxyError(err, 'Failed to attach avatar to user')
  })
})

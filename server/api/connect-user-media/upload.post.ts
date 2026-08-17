import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { authenticateWithConnectApi, getConnectApiProxyHeaders } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'
import { resolveConnectApiUrl, toBrowserMediaUrl } from '../../utils/connectApi'

export default defineEventHandler(async (event) => {
  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  try {
    const auth = await authenticateWithConnectApi(event)
    const { email } = auth

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to upload media'
      })
    }

    const formData = await readMultipartFormData(event)
    const file = formData?.find((field) => field.name === 'file')

    if (!file || !file.data || file.data.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File is required'
      })
    }

    const ownerId = await getUserIdFromEmail(email, connectApiUrl)
    const alt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()
    const requestedKind = formData?.find((field) => field.name === 'kind')?.data?.toString('utf-8')?.trim()
    const kind = requestedKind || 'post-images'

    const formDataToSend = new FormData()
    const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
    formDataToSend.append('file', blob, file.filename || 'upload')
    formDataToSend.append('kind', kind)
    // SSO fallback: connect-api accepts a session email when no JWT is present.
    formDataToSend.append('email', email)
    // connect-api reads doc fields from `_payload` on multipart creates.
    const payloadData: Record<string, unknown> = {
      owner: ownerId,
      kind,
      email
    }
    if (alt) payloadData.alt = alt
    formDataToSend.append('_payload', JSON.stringify(payloadData))

    // Multipart must set its own boundary, so drop the JSON content type.
    const headers = getConnectApiProxyHeaders(event, auth)
    delete headers['Content-Type']

    const mediaUploadResponse = await fetch(`${connectApiUrl}/api/connect-user-media`, {
      method: 'POST',
      headers,
      body: formDataToSend
    })
    const mediaUploadJson = await mediaUploadResponse.json().catch(() => ({}))
    if (!mediaUploadResponse.ok) {
      throw createError({
        statusCode: mediaUploadResponse.status,
        statusMessage:
          mediaUploadJson?.error ||
          mediaUploadJson?.errors?.[0]?.message ||
          mediaUploadResponse.statusText ||
          'Failed to upload media',
        data: mediaUploadJson
      })
    }
    const mediaResponse = mediaUploadJson as { id?: number | string; doc?: { id?: number | string }; url?: string }
    const uploadedIdRaw = mediaResponse.id ?? mediaResponse.doc?.id
    const uploadedId =
      typeof uploadedIdRaw === 'string' ? parseInt(uploadedIdRaw, 10) : uploadedIdRaw

    if (!uploadedId || Number.isNaN(uploadedId)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Upload succeeded but no media id was returned',
        data: { mediaUploadJson }
      })
    }
    mediaResponse.id = uploadedId

    const browserUrl = toBrowserMediaUrl(mediaResponse.url)
    if (browserUrl) mediaResponse.url = browserUrl

    return mediaResponse
  } catch (error: any) {
    console.error('Connect API upload error:', {
      message: error?.message,
      statusCode: error?.statusCode || error?.status,
      statusMessage: error?.statusMessage,
      data: error?.data,
      errors: error?.data?.errors
    })
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to upload media',
      data: error.data
    })
  }
})

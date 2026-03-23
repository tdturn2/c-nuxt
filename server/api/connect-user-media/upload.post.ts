import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const { token, email } = await authenticateWithPayloadCMS(event)

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

    const ownerId = await getUserIdFromEmail(email, payloadBaseUrl)
    const alt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()
    const requestedKind = formData?.find((field) => field.name === 'kind')?.data?.toString('utf-8')?.trim()
    const kind = requestedKind || 'post-images'

    const formDataToSend = new FormData()
    const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
    formDataToSend.append('file', blob, file.filename || 'upload')
    // Payload multipart create expects doc fields in `_payload`.
    const payloadData: Record<string, unknown> = {
      owner: ownerId,
      kind
    }
    if (alt) payloadData.alt = alt
    formDataToSend.append('_payload', JSON.stringify(payloadData))

    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const mediaUploadResponse = await fetch(`${payloadBaseUrl}/api/connect-user-media`, {
      method: 'POST',
      headers,
      body: formDataToSend
    })
    const mediaUploadJson = await mediaUploadResponse.json().catch(() => ({}))
    if (!mediaUploadResponse.ok) {
      throw createError({
        statusCode: mediaUploadResponse.status,
        statusMessage: mediaUploadResponse.statusText || 'Failed to upload media',
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

    if (mediaResponse?.url && !mediaResponse.url.startsWith('http')) {
      mediaResponse.url = mediaResponse.url.startsWith('/')
        ? `${payloadBaseUrl}${mediaResponse.url}`
        : `${payloadBaseUrl}/${mediaResponse.url}`
    }

    return mediaResponse
  } catch (error: any) {
    console.error('PayloadCMS API Error:', {
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

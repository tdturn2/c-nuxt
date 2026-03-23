import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    // Authenticate with PayloadCMS using SSO email
    const { token, email } = await authenticateWithPayloadCMS(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to upload avatar'
      })
    }

    // Read multipart form data
    const formData = await readMultipartFormData(event)
    // Accept both legacy `avatar` and generic `file` field names.
    const file = formData?.find(field => field.name === 'avatar') || formData?.find(field => field.name === 'file')

    if (!file || !file.data || file.data.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Avatar file is required (multipart field name: avatar or file)'
      })
    }

    const ownerId = await getUserIdFromEmail(email, payloadBaseUrl)
    const alt = formData?.find((field) => field.name === 'alt')?.data?.toString('utf-8')?.trim()

    // Upload file to PayloadCMS connect-user-media endpoint
    const formDataToSend = new FormData()
    const uploadFile = new File(
      [file.data],
      file.filename || 'avatar.jpg',
      { type: file.type || 'image/jpeg' }
    )
    formDataToSend.append('file', uploadFile)
    // Payload upload endpoint expects doc data in `_payload` for multipart creates.
    const payloadData: Record<string, unknown> = {
      owner: ownerId,
      kind: 'avatars',
    }
    if (alt) payloadData.alt = alt
    formDataToSend.append('_payload', JSON.stringify(payloadData))

    const headers: Record<string, string> = {}
    
    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Upload to PayloadCMS connect-user-media endpoint using native fetch for multipart reliability.
    const mediaUploadResponse = await fetch(`${payloadBaseUrl}/api/connect-user-media`, {
      method: 'POST',
      headers,
      body: formDataToSend
    })
    const mediaUploadJson = await mediaUploadResponse.json().catch(() => ({}))
    if (!mediaUploadResponse.ok) {
      throw createError({
        statusCode: mediaUploadResponse.status,
        statusMessage: mediaUploadResponse.statusText || 'Failed to upload avatar media',
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

    // Update user profile with new avatar ID using /profile endpoint
    const updateData: any = {
      avatarConnectUserMedia: uploadedId,
      email // Include email for SSO authentication
    }

    // Update user profile
    const userResponse = await $fetch(`${payloadBaseUrl}/api/connect-users/profile`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: updateData
    })

    // Normalize avatar URL
    if (userResponse?.avatar?.url && !userResponse.avatar.url.startsWith('http')) {
      userResponse.avatar.url = `${payloadBaseUrl}${userResponse.avatar.url}`
    }

    return userResponse
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
      statusMessage: error.statusMessage || 'Failed to upload avatar to PayloadCMS',
      data: error.data
    })
  }
})

import { defineEventHandler, readMultipartFormData, createError, getHeader } from 'h3'
import { authenticateWithPayloadCMS } from '../../../utils/payloadAuth'

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
    const file = formData?.find(field => field.name === 'avatar')

    if (!file || !file.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Avatar file is required'
      })
    }

    // Upload file to PayloadCMS media endpoint
    const formDataToSend = new FormData()
    const blob = new Blob([file.data], { type: file.type || 'image/jpeg' })
    formDataToSend.append('file', blob, file.filename || 'avatar.jpg')

    const headers: Record<string, string> = {}
    
    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Upload to PayloadCMS media endpoint
    const mediaResponse = await $fetch(`${payloadBaseUrl}/api/media`, {
      method: 'POST',
      headers,
      body: formDataToSend
    }) as { id: number; url: string }

    // Update user profile with new avatar ID using /profile endpoint
    const updateData: any = {
      avatar: mediaResponse.id,
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
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to upload avatar to PayloadCMS',
      data: error.data
    })
  }
})

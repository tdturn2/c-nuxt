import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    // Authenticate with PayloadCMS using SSO email
    const { token, email } = await authenticateWithPayloadCMS(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to update profile'
      })
    }

    const body = await readBody(event) as { 
      bio?: string | null
      avatar?: string | null // Base64 or URL
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Prepare update data
    const updateData: any = {}

    if (body.bio !== undefined) {
      updateData.bio = body.bio
    }

    // For avatar, if it's a base64 string, we need to upload it first
    // For now, assume avatar is already uploaded and we're just updating the reference
    // Or it could be a file ID if uploaded via PayloadCMS media endpoint
    if (body.avatar !== undefined) {
      updateData.avatar = body.avatar
    }

    // Include email for email-based authentication if no token
    if (!token && email) {
      updateData.email = email
    }

    // Use /profile endpoint for SSO users
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users/profile`, {
      method: 'PATCH',
      headers,
      body: {
        ...updateData,
        email // Include email for SSO authentication
      }
    })

    // Normalize avatar URL if present
    if (response?.avatar?.url && !response.avatar.url.startsWith('http')) {
      response.avatar.url = `${payloadBaseUrl}${response.avatar.url}`
    }

    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update profile in PayloadCMS',
      data: error.data
    })
  }
})

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const payloadApiUrl = `${payloadBaseUrl}/api/connect-posts/create`

  try {
    const body = await readBody(event) as {
      content: any
      audience?: string[]
    }

    if (!body?.content) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Post content is required'
      })
    }

    // Authenticate with PayloadCMS using SSO email
    const { token, email } = await authenticateWithPayloadCMS(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to create a post'
      })
    }

    // Get PayloadCMS user ID from email (shared utility)
    const authorId = await getUserIdFromEmail(email, payloadBaseUrl)

    // Get cookies and authorization headers from the incoming request
    const cookieHeader = getHeader(event, 'cookie')
    const authHeader = getHeader(event, 'authorization')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Forward authorization header if present
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    // Forward all cookies if present (for PayloadCMS session/auth)
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
    }

    // Add auth token if available (from authenticateWithPayloadCMS)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Prepare post data with author field
    const postData: any = {
      author: authorId,
      content: body.content
    }

    // Include audience if provided
    if (Array.isArray(body.audience) && body.audience.length > 0) {
      postData.audience = body.audience
    }

    // Include email for email-based authentication if no token
    if (!token && email) {
      postData.email = email
    }

    const response = await $fetch(payloadApiUrl, {
      method: 'POST',
      headers,
      body: postData
    })

    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create post in PayloadCMS',
      data: error.data
    })
  }
})

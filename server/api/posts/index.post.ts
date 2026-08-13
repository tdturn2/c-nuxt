import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.connectApi || 'http://localhost:3003'
  const payloadApiUrl = `${payloadBaseUrl}/api/connect-posts/create`

  try {
    const body = await readBody(event) as {
      content: any
      mentions?: Array<string | number>
      audience?: string[]
      categories?: string[]
      images?: any
      imagesConnectUserMedia?: any
      author?: string | number
      connectUserId?: string | number
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

    // Default author is the signed-in user. Admins may pass author/connectUserId (enforced by API).
    const sessionAuthorId = await getUserIdFromEmail(email, payloadBaseUrl)
    const requestedAuthorRaw = body.author ?? body.connectUserId
    const requestedAuthorId =
      typeof requestedAuthorRaw === 'number'
        ? requestedAuthorRaw
        : typeof requestedAuthorRaw === 'string' && requestedAuthorRaw.trim()
          ? Number.parseInt(requestedAuthorRaw, 10)
          : null
    const authorId =
      requestedAuthorId != null && Number.isFinite(requestedAuthorId) && requestedAuthorId > 0
        ? requestedAuthorId
        : sessionAuthorId

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

    if (Array.isArray(body.mentions)) {
      postData.mentions = body.mentions
    }

    // Include audience if provided
    if (Array.isArray(body.audience) && body.audience.length > 0) {
      postData.audience = body.audience
    }

    // Categories carry notification flags (e.g. `priority`, `notify-until:<iso>`).
    if (Array.isArray(body.categories) && body.categories.length > 0) {
      postData.categories = body.categories
    }

    if (body.imagesConnectUserMedia !== undefined) {
      postData.imagesConnectUserMedia = body.imagesConnectUserMedia
    } else if (body.images !== undefined) {
      // Prefer new field but keep legacy compatibility for callers still sending `images`.
      postData.imagesConnectUserMedia = body.images
      postData.images = body.images
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

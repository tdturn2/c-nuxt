import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const payloadApiUrl = `${payloadBaseUrl}/api/connect-comments/create`

  try {
    const body = await readBody(event) as { 
      post: number
      parent?: number | null
      content: any
    }

    if (!body.post) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Post ID is required'
      })
    }

    if (!body.content) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Comment content is required'
      })
    }

    // Authenticate with PayloadCMS using SSO email
    const auth = await authenticateWithPayloadCMS(event)
    const { token, email } = auth

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to comment'
      })
    }

    // Get PayloadCMS user ID from email (shared utility)
    const authorId = await getUserIdFromEmail(email, payloadBaseUrl)

    const headers = getPayloadProxyHeaders(event, auth)

    // Prepare comment data with author field
    const commentData: any = {
      post: body.post,
      author: authorId,
      content: body.content
    }

    // Include parent if it's a reply (only 1 level deep)
    if (body.parent) {
      commentData.parent = body.parent
    }

    // Include email for email-based authentication if no token
    if (!token && email) {
      commentData.email = email
    }

    const response: any = await $fetch(payloadApiUrl, {
      method: 'POST',
      headers,
      body: commentData
    })

    // Prefer new avatar relation, fallback to legacy avatar.
    if (response?.author) {
      response.author.avatar = response.author.avatarConnectUserMedia || response.author.avatar || null
    }

    // Normalize avatar URLs
    if (response?.author?.avatar?.url && !response.author.avatar.url.startsWith('http')) {
      response.author.avatar.url = `${payloadBaseUrl}${response.author.avatar.url}`
    }

    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create comment in PayloadCMS',
      data: error.data
    })
  }
})

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

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
    const { token, email } = await authenticateWithPayloadCMS(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to comment'
      })
    }

    // Get PayloadCMS user ID from email
    let authorId: number | undefined
    try {
      const userResponse = await $fetch(`${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      }) as { docs: Array<{ id: number }> }
      
      authorId = userResponse?.docs?.[0]?.id
      
      if (!authorId) {
        throw createError({
          statusCode: 404,
          statusMessage: 'User not found in PayloadCMS'
        })
      }
    } catch (error: any) {
      console.error('Error fetching user ID:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to resolve user ID'
      })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

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

    const response = await $fetch(payloadApiUrl, {
      method: 'POST',
      headers,
      body: commentData
    })

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

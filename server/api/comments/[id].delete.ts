import { defineEventHandler, createError, getRouterParam, getHeader } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const commentId = getRouterParam(event, 'id')
  
  if (!commentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Comment ID is required'
    })
  }

  try {
    // Authenticate with PayloadCMS using SSO email
    const { token, email } = await authenticateWithPayloadCMS(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to delete comment'
      })
    }

    // Get PayloadCMS user ID from email to verify ownership
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

    // Verify the comment belongs to the current user
    const commentResponse = await $fetch(`${payloadBaseUrl}/api/connect-comments/${commentId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }) as { author: number | { id: number } }

    const commentAuthorId = typeof commentResponse.author === 'object' 
      ? commentResponse.author.id 
      : commentResponse.author

    if (commentAuthorId !== authorId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - you can only delete your own comments'
      })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Use /delete/:id endpoint for SSO users
    const deleteData: any = {}

    // Include email for email-based authentication if no token
    if (!token && email) {
      deleteData.email = email
    }

    const response = await $fetch(`${payloadBaseUrl}/api/connect-comments/delete/${commentId}`, {
      method: 'DELETE',
      headers,
      ...(Object.keys(deleteData).length > 0 ? { body: deleteData } : {})
    })
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete comment from PayloadCMS',
      data: error.data
    })
  }
})

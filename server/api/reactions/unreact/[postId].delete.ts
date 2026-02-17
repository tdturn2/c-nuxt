import { defineEventHandler, getRouterParam, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const postId = getRouterParam(event, 'postId')
  const config = useRuntimeConfig()
  const payloadApiUrl = `${config.public.payloadBaseUrl}/api/connect-post-reactions/unreact/${postId}`
  
  try {
    // Authenticate with PayloadCMS using SSO email
    const { token, email } = await authenticateWithPayloadCMS(event)
    
    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to unreact'
      })
    }
    
    // Build headers with PayloadCMS authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    // Include email in request body for email-based SSO authentication
    const requestBody = email ? { email } : undefined

    const response = await $fetch(payloadApiUrl, {
      method: 'DELETE',
      headers,
      body: requestBody
    })
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error (unreact):', error)
    
    // Handle different error types
    let statusCode = 500
    let statusMessage = `Failed to unreact for post ${postId} in PayloadCMS`
    
    if (error?.statusCode) {
      statusCode = error.statusCode
    } else if (error?.status) {
      statusCode = error.status
    }
    
    if (typeof error?.statusMessage === 'string' && error.statusMessage) {
      statusMessage = error.statusMessage
    } else if (typeof error?.message === 'string' && error.message) {
      statusMessage = error.message
    }
    
    throw createError({
      statusCode,
      statusMessage,
      data: error?.data || error
    })
  }
})

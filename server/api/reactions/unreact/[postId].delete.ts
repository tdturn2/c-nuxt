import { defineEventHandler, getRouterParam, createError, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const postId = getRouterParam(event, 'postId')
  const config = useRuntimeConfig()
  const payloadApiUrl = `${config.public.payloadBaseUrl}/api/connect-post-reactions/unreact/${postId}`
  
  try {
    // Get all cookies and authorization headers from the incoming request
    const cookieHeader = getHeader(event, 'cookie')
    const authHeader = getHeader(event, 'authorization')
    
    // Build headers to forward to PayloadCMS
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Forward authorization header if present
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
    
    // Forward all cookies if present
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
    }

    const response = await $fetch(payloadApiUrl, {
      method: 'DELETE',
      headers
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

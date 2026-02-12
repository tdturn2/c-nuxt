import { defineEventHandler, getRouterParam, createError, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const config = useRuntimeConfig()
  const payloadApiUrl = `${config.public.payloadBaseUrl}/api/connect-post-reactions/${id}`
  
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

    console.log('Deleting reaction:', id, 'Headers:', { 
      hasAuth: !!authHeader, 
      hasCookies: !!cookieHeader,
      cookieCount: cookieHeader ? cookieHeader.split(';').length : 0
    })

    const response = await $fetch(payloadApiUrl, {
      method: 'DELETE',
      headers
    })
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    
    // Handle different error types - $fetch uses 'status', some APIs use 'statusCode'
    const statusCode = error?.statusCode || error?.status || 500
    const statusMessage = (typeof error?.statusMessage === 'string' && error.statusMessage) ||
                         (typeof error?.message === 'string' && error.message) ||
                         `Failed to delete reaction ${id} in PayloadCMS`
    
    throw createError({
      statusCode,
      statusMessage,
      data: error?.data || error
    })
  }
})

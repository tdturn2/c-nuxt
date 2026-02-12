import { defineEventHandler, readBody, createError, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const payloadApiUrl = `${payloadBaseUrl}/api/connect-post-reactions`
  
  try {
    const body = await readBody(event)
    
    // Get all cookies and authorization headers from the incoming request
    const cookieHeader = getHeader(event, 'cookie')
    const authHeader = getHeader(event, 'authorization')
    
    console.log('Reaction POST - Cookies:', cookieHeader ? 'Present' : 'Missing')
    console.log('Reaction POST - Auth:', authHeader ? 'Present' : 'Missing')
    
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
    
    console.log('Reaction POST - Forwarding headers:', Object.keys(headers))
    
    const response = await $fetch(payloadApiUrl, {
      method: 'POST',
      headers,
      body: body
    })
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create reaction in PayloadCMS',
      data: error.data
    })
  }
})

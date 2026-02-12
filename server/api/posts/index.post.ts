export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const payloadApiUrl = config.public.payloadApiUrl || 'http://localhost:3002/api/connect-posts'
  
  try {
    const body = await readBody(event)
    
    // Author ID should come from the request body (set by authenticated user)
    // If not provided, use default for testing
    const authorId = body.author || 1 // TODO: Get from authenticated user session
    
    const payload = {
      author: authorId,
      content: body.content,
      categories: body.categories || []
    }
    
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
      method: 'POST',
      headers,
      body: payload
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

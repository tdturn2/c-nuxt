export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadApiUrl = config.public.payloadApiUrl || 'http://localhost:3002/api/connect-posts'
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Post ID is required'
    })
  }
  
  try {
    const body = await readBody(event)
    
    const cookieHeader = getHeader(event, 'cookie')
    const authHeader = getHeader(event, 'authorization')
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
    
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
    }
    
    // Build update payload - only include fields that are provided
    const payload: any = {}
    if (body.content) payload.content = body.content
    if (body.categories !== undefined) payload.categories = body.categories
    if (body.author) payload.author = body.author
    if (body.images !== undefined) payload.images = body.images
    
    const response = await $fetch(`${payloadApiUrl}/${id}`, {
      method: 'PATCH',
      headers,
      body: payload
    })
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update post in PayloadCMS',
      data: error.data
    })
  }
})

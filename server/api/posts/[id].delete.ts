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
    
    const response = await $fetch(`${payloadApiUrl}/${id}`, {
      method: 'DELETE',
      headers
    })
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete post from PayloadCMS',
      data: error.data
    })
  }
})

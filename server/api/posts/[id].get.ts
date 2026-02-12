export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
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
    
    const response = await $fetch(`${payloadBaseUrl}/api/connect-posts/${id}`, {
      headers
    })
    
    // Normalize image URLs if they're relative
    if (response?.images && Array.isArray(response.images)) {
      response.images = response.images.map((img: any) => {
        if (img.image?.url) {
          const url = img.image.url
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.startsWith('/')) {
              img.image.url = `${payloadBaseUrl}${url}`
            } else {
              img.image.url = `${payloadBaseUrl}/${url}`
            }
          }
        }
        return img
      })
    }
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch post from PayloadCMS',
      data: error.data
    })
  }
})

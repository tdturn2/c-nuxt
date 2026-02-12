export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadApiUrl = config.public.payloadApiUrl || 'http://localhost:3002/api/connect-posts'
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  
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
    
    // Fetch posts with populated author data (including avatar)
    const response = await $fetch(payloadApiUrl, {
      headers,
      query: {
        populate: 'author.avatar'
      }
    })
    
    // Normalize image URLs and avatar URLs if they're relative
    if (response.docs && Array.isArray(response.docs)) {
      response.docs = response.docs.map((post: any) => {
        // Normalize author avatar URL
        if (post.author?.avatar?.url) {
          const url = post.author.avatar.url
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.startsWith('/')) {
              post.author.avatar.url = `${payloadBaseUrl}${url}`
            } else {
              post.author.avatar.url = `${payloadBaseUrl}/${url}`
            }
          }
        }
        
        // Normalize image URLs
        if (post.images && Array.isArray(post.images)) {
          post.images = post.images.map((img: any) => {
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
        return post
      })
    }
    
    return response
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch posts from PayloadCMS',
    })
  }
})

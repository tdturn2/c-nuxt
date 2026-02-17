import { defineEventHandler, createError, getHeader, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const query = getQuery(event)
  
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

    // Build query string for PayloadCMS
    // PayloadCMS uses where[field][equals]=value format
    const queryString = new URLSearchParams(query as Record<string, string>).toString()
    const payloadApiUrl = `${payloadBaseUrl}/api/connect-post-reactions${queryString ? `?${queryString}` : ''}`

    //console.log('Fetching reactions from:', payloadApiUrl)
    const response = await $fetch(payloadApiUrl, { headers }) as { docs: any[] }
    //console.log('Reactions response:', response)
    
    // Normalize avatar URLs in reactions
    if (response?.docs) {
      response.docs.forEach(reaction => {
        if (reaction.user?.avatar?.url && !reaction.user.avatar.url.startsWith('http')) {
          reaction.user.avatar.url = `${payloadBaseUrl}${reaction.user.avatar.url}`
        }
      })
    }
    
    return response
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch reactions from PayloadCMS',
    })
  }
})

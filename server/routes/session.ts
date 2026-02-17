// Handle /session route and proxy to /api/auth/session
// This is a workaround for @sidebase/nuxt-auth calling /session instead of /api/auth/session
export default defineEventHandler(async (event) => {
  // Get cookies from the request
  const cookies = getHeader(event, 'cookie') || ''
  
  // Use $fetch with the full URL to call the actual session endpoint
  const baseURL = process.env.AUTH_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const sessionUrl = `${baseURL}/api/auth/session`
  
  try {
    // Forward the request to the actual session endpoint
    const response = await $fetch(sessionUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Accept': 'application/json'
      }
    })
    
    return response
  } catch (error: any) {
    // If session endpoint returns an error, return null (unauthenticated)
    if (error.statusCode === 401 || error.status === 401 || error.statusCode === 404 || error.status === 404) {
      return null
    }
    
    // For other errors, return null to indicate unauthenticated
    return null
  }
})

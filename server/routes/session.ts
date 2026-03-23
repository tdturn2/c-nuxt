// Handle /session route and proxy to /api/auth/session
// This is a workaround for @sidebase/nuxt-auth calling /session instead of /api/auth/session
export default defineEventHandler(async (event) => {
  // Get cookies from the request
  const cookies = getHeader(event, 'cookie') || ''

  try {
    // Forward internally so this does not depend on AUTH_URL being set correctly.
    const response = await event.fetch('/api/auth/session', {
      headers: {
        'Cookie': cookies,
        'Accept': 'application/json'
      }
    }).then((r: Response) => r.json()).catch(() => null)

    return response || null
  } catch (error: any) {
    // If session endpoint returns an error, return null (unauthenticated)
    if (error.statusCode === 401 || error.status === 401 || error.statusCode === 404 || error.status === 404) {
      return null
    }
    
    // For other errors, return null to indicate unauthenticated
    return null
  }
})

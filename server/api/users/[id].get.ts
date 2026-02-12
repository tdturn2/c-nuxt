export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const payloadBaseUrl = process.env.PAYLOAD_BASE_URL || 'http://localhost:3002'
  
  try {
    // Use the API endpoint, not the admin endpoint
    const user = await $fetch(`${payloadBaseUrl}/api/connect-users/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    // Normalize avatar URL if it's relative
    if (user.avatar?.url) {
      const url = user.avatar.url
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.startsWith('/')) {
          user.avatar.url = `${payloadBaseUrl}${url}`
        } else {
          user.avatar.url = `${payloadBaseUrl}/${url}`
        }
      }
    }
    
    return user
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch user ${id} from PayloadCMS`,
    })
  }
})

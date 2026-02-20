export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required'
    })
  }
  
  try {
    // Query connect-users collection explicitly
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
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: `User ${id} not found in connect-users`
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch user ${id} from connect-users: ${error.message || 'Unknown error'}`,
    })
  }
})

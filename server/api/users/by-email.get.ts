export default defineEventHandler(async (event) => {
  const email = getQuery(event).email as string
  
  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email query parameter is required'
    })
  }
  
  const payloadBaseUrl = process.env.PAYLOAD_BASE_URL || 'http://localhost:3002'
  
  try {
    // Query PayloadCMS for user by email
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }) as { docs: Array<{ id: number }> }
    
    const user = response?.docs?.[0]
    
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }
    
    return { id: user.id }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch user by email: ${error.message}`
    })
  }
})

import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const username = query.username as string
  
  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username is required'
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  
  try {
    // Convert username back to email (add @asburyseminary.edu)
    const email = `${username}@asburyseminary.edu`
    
    // Query PayloadCMS for user by email
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }) as { docs: Array<{ 
      id: number
      name: string
      email: string
      bio: string | null
      avatar?: { url: string } | null
    }> }
    
    const user = response?.docs?.[0]
    
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Prefer new avatar relation, fallback to legacy avatar to keep UI contract stable.
    user.avatar = (user as any).avatarConnectUserMedia || user.avatar || null
    
    // Normalize avatar URL if it's relative
    if (user.avatar?.url && !user.avatar.url.startsWith('http')) {
      if (user.avatar.url.startsWith('/')) {
        user.avatar.url = `${payloadBaseUrl}${user.avatar.url}`
      } else {
        user.avatar.url = `${payloadBaseUrl}/${user.avatar.url}`
      }
    }
    
    return user
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch user by username: ${error.message}`
    })
  }
})

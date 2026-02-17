import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = query.q as string
  
  // If no query, return empty (or could return recent users)
  if (!searchQuery || searchQuery.trim().length === 0) {
    return { docs: [] }
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  
  try {
    // Search users by name (case-insensitive)
    // PayloadCMS query format: where[name][contains]=searchQuery
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users`, {
      headers: {
        'Content-Type': 'application/json',
      },
      query: {
        'where[name][contains]': searchQuery.trim(),
        limit: 10, // Limit results
        sort: 'name' // Sort alphabetically
      }
    }) as { docs: Array<{ id: number; name: string; email: string; avatar?: { url: string } | null }> }
    
    // Return simplified user data for autocomplete
    const users = response.docs.map(user => {
      let avatarUrl = user.avatar?.url || null
      
      // Normalize avatar URL if it's relative
      if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        if (avatarUrl.startsWith('/')) {
          avatarUrl = `${payloadBaseUrl}${avatarUrl}`
        } else {
          avatarUrl = `${payloadBaseUrl}/${avatarUrl}`
        }
      }
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: avatarUrl
      }
    })
    
    return { docs: users }
  } catch (error: any) {
    console.error('Error searching users:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to search users: ${error.message}`
    })
  }
})

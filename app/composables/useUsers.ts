interface User {
  id: number
  name: string
  avatar: {
    id: number
    url: string
    alt: string
  } | null
  bio: string
  email: string
}

const userCache = new Map<number, User>()

export const useUsers = () => {
  const fetchUser = async (userId: number): Promise<User | null> => {
    // Check cache first
    if (userCache.has(userId)) {
      return userCache.get(userId)!
    }

    try {
      // Use Nuxt server route to avoid CORS issues
      const user = await $fetch<User>(`/api/users/${userId}`)
      userCache.set(userId, user)
      return user
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error)
      return null
    }
  }

  const fetchUsers = async (userIds: number[]): Promise<Map<number, User>> => {
    const uniqueIds = [...new Set(userIds)]
    const users = new Map<number, User>()
    const uncachedIds: number[] = []

    // Check cache for each user
    uniqueIds.forEach(id => {
      if (userCache.has(id)) {
        users.set(id, userCache.get(id)!)
      } else {
        uncachedIds.push(id)
      }
    })

    // Fetch uncached users in parallel
    if (uncachedIds.length > 0) {
      const fetchPromises = uncachedIds.map(id => fetchUser(id))
      const fetchedUsers = await Promise.all(fetchPromises)
      
      fetchedUsers.forEach((user, index) => {
        if (user && uncachedIds[index] !== undefined) {
          users.set(uncachedIds[index], user)
        }
      })
    }

    return users
  }

  return {
    fetchUser,
    fetchUsers,
    clearCache: () => userCache.clear()
  }
}

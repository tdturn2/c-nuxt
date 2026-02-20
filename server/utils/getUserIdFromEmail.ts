import { createError } from 'h3'

/**
 * Shared utility to get PayloadCMS user ID from SSO email
 * Used by posts, comments, and other endpoints that need to resolve author/user IDs
 */
export async function getUserIdFromEmail(email: string, payloadBaseUrl: string): Promise<number> {
  try {
    const userResponse = await $fetch(`${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }) as { docs: Array<{ id: number }> }
    
    const userId = userResponse?.docs?.[0]?.id
    
    if (!userId) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found in PayloadCMS'
      })
    }
    
    return userId
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    console.error('Error fetching user ID:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to resolve user ID'
    })
  }
}

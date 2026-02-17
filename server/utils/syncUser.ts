// Sync authenticated user to PayloadCMS connect-users collection
// Uses PayloadCMS /sync endpoint which handles create/update automatically
export async function syncUserToPayload(user: {
  id: string
  name: string | null | undefined
  email: string | null | undefined
  image?: string | null | undefined
  groups?: string[] | null | undefined
}) {
  if (!user.email) {
    console.warn('[User Sync] Cannot sync user without email')
    return null
  }
  
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const syncUrl = `${payloadBaseUrl}/api/connect-users/sync`
  
  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  // Build user payload for sync endpoint
  const userPayload: any = {
    email: user.email,
    name: user.name || '',
  }
  
  // Add groups if available (will be added later when Azure AD is configured)
  if (user.groups && user.groups.length > 0) {
    userPayload.groups = user.groups
  }
  
  try {
    console.log(`[User Sync] Syncing user: ${user.email}`)
    const result = await $fetch(syncUrl, {
      method: 'POST',
      headers,
      body: userPayload,
    })
    console.log(`[User Sync] Successfully synced user: ${user.email}`)
    return result
  } catch (error: any) {
    console.error(`[User Sync] Failed to sync user ${user.email}:`, {
      message: error.message,
      statusCode: error.statusCode || error.status,
      statusMessage: error.statusMessage,
      data: error.data,
      errors: error.data?.errors
    })
    // Log full error details for debugging
    if (error.data?.errors) {
      console.error('[User Sync] PayloadCMS errors:', JSON.stringify(error.data.errors, null, 2))
    }
    // Don't throw - we don't want to break authentication if sync fails
    return null
  }
}

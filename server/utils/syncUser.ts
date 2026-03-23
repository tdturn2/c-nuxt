// Derive roles from Azure AD memberOf/groups. Options: faculty, staff, student, alumni.
// Based on legacy PHP mapping: CX Students, CX Faculty, CX Staff, FacultySec, CX Alumni, etc.
function deriveRolesFromGroups(groups: string[]): ('faculty' | 'staff' | 'student' | 'alumni')[] {
  const roles = new Set<'faculty' | 'staff' | 'student' | 'alumni'>()
  const lower = (s: string) => s.toLowerCase()

  for (const g of groups) {
    const gLower = lower(g || '')
    if (!gLower) continue
    // CX Students
    if (gLower.includes('cx students')) roles.add('student')
    // CX Faculty, FacultySec, CN=FacultySec
    if (gLower.includes('cx faculty') || gLower.includes('facultysec')) roles.add('faculty')
    // OU=Staff, CX Staff, FacultySec
    if (gLower.includes('cx staff') || gLower.includes('ou=staff') || gLower.includes('facultysec')) roles.add('staff')
    // CX Alumni
    if (gLower.includes('cx alumni')) roles.add('alumni')
  }

  return Array.from(roles)
}

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
  // Server-side sync should use server runtime config / env, not public runtime config.
  // On Vercel, `config.public.*` may be unset unless using `NUXT_PUBLIC_*` env vars.
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    console.error('[User Sync] Missing PAYLOAD_BASE_URL; cannot sync user in production.')
    return null
  }
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

    // Update roles via dedicated endpoint (PATCH /api/connect-users/me/roles)
    const roles = user.groups?.length ? deriveRolesFromGroups(user.groups) : []
    const rolesUrl = `${payloadBaseUrl}/api/connect-users/me/roles`
    try {
      await $fetch(rolesUrl, {
        method: 'PATCH',
        headers,
        body: { roles, email: user.email },
      })
      console.log(`[User Sync] Updated roles for ${user.email}:`, roles)
    } catch (rolesError: any) {
      console.error(`[User Sync] Failed to update roles for ${user.email}:`, rolesError)
      // Don't fail sync if roles update fails
    }

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

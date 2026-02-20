// Shared utility for authenticating with PayloadCMS using SSO email
import { getHeader } from 'h3'

export async function authenticateWithPayloadCMS(event: any): Promise<{ token: string | null; email: string | null }> {
  try {
    const cookieHeader = getHeader(event, 'cookie') || ''
    // Get SSO session
    const session: any = await event.fetch('/api/auth/session', {
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json'
      }
    }).then((r: Response) => r.json()).catch(() => null)
    
    if (!session?.user?.email) {
      return { token: null, email: null }
    }
    
    const config = useRuntimeConfig()
    const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
    
    // SSO only: call /sync with email (and name/avatar if we have them). Do not call /login (email+password only).
    try {
      const syncResponse: any = await $fetch(`${payloadBaseUrl}/api/connect-users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: session.user.email,
          name: session.user.name ?? undefined,
          avatar: session.user.image ?? undefined
        }
      })
      
      // If sync returns a token, use it
      if (syncResponse?.token) {
        return { token: syncResponse.token, email: session.user.email }
      }
      
      // No token (e.g. existing user): identify by email on survey and similar requests. Do not call /login for SSO.
      return { token: null, email: session.user.email }
    } catch (authError) {
      console.error('Error syncing with PayloadCMS:', authError)
      return { token: null, email: session.user.email }
    }
  } catch (error) {
    console.error('Error getting session for PayloadCMS auth:', error)
    return { token: null, email: null }
  }
}

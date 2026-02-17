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
    
    // Authenticate with PayloadCMS using email (for SSO users)
    // PayloadCMS /sync endpoint should handle authentication for existing users
    // Or use a login endpoint that accepts email
    try {
      // Try to authenticate via sync endpoint (which may return auth token)
      const syncResponse: any = await $fetch(`${payloadBaseUrl}/api/connect-users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          email: session.user.email
        }
      })
      
      // If sync returns a token, use it
      if (syncResponse?.token) {
        return { token: syncResponse.token, email: session.user.email }
      }
      
      // Otherwise, try login endpoint with email
      const loginResponse: any = await $fetch(`${payloadBaseUrl}/api/connect-users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          email: session.user.email
        }
      }).catch(() => null)
      
      if (loginResponse?.token) {
        return { token: loginResponse.token, email: session.user.email }
      }
      
      // If no token, return email for email-based auth
      return { token: null, email: session.user.email }
    } catch (authError) {
      console.error('Error authenticating with PayloadCMS:', authError)
      return { token: null, email: session.user.email }
    }
  } catch (error) {
    console.error('Error getting session for PayloadCMS auth:', error)
    return { token: null, email: null }
  }
}

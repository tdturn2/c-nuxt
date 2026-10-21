// SSO session only - no Payload sync. Use for endpoints that pass email to Payload.
import { getHeader } from 'h3'

export async function getSSOSession(event: any): Promise<{ email: string | null; canvasLoginId: string | null }> {
  try {
    const cookieHeader = getHeader(event, 'cookie') || ''
    const session: any = await event.fetch('/api/auth/session', {
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json'
      }
    }).then((r: Response) => r.json()).catch(() => null)

    const canvasLoginId =
      typeof session?.canvasLoginId === 'string' && session.canvasLoginId.trim()
        ? session.canvasLoginId.trim()
        : null

    if (!session?.user?.email) {
      return { email: null, canvasLoginId: null }
    }

    return { email: session.user.email, canvasLoginId }
  } catch (error) {
    console.error('Error getting SSO session:', error)
    return { email: null, canvasLoginId: null }
  }
}

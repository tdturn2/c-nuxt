import { syncUserToPayload } from '../../utils/syncUser'
import { issueMobileAccessToken, issueMobileRefreshToken, verifyAzureIdToken } from '../../utils/mobileAuth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ idToken?: string }>(event)
  const idToken = (body?.idToken || '').trim()

  if (!idToken) {
    throw createError({ statusCode: 400, statusMessage: 'idToken is required.' })
  }

  let identity
  try {
    identity = await verifyAzureIdToken(idToken)
  } catch (error: any) {
    const reason = error?.message || error?.cause?.message || 'Unknown verification error'
    console.error('[MobileAuth] Azure token verification failed:', {
      message: reason,
      code: error?.code,
      cause: error?.cause?.message,
    })
    const detail = import.meta.dev ? `Invalid Azure ID token: ${reason}` : 'Invalid Azure ID token.'
    throw createError({ statusCode: 401, statusMessage: detail })
  }
  if (!identity.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Could not resolve user email from token claims.',
    })
  }

  await syncUserToPayload({
    id: identity.subject,
    email: identity.email,
    name: identity.name,
    groups: identity.groups,
  })

  const accessToken = await issueMobileAccessToken({
    sub: identity.subject,
    email: identity.email,
    name: identity.name,
    groups: identity.groups,
  })
  const refreshToken = await issueMobileRefreshToken({
    sub: identity.subject,
    email: identity.email,
    name: identity.name,
    groups: identity.groups,
  })

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 60 * 30,
    refreshExpiresIn: 60 * 60 * 24 * 14,
    user: {
      id: identity.subject,
      email: identity.email,
      name: identity.name,
      groups: identity.groups,
    },
  }
})

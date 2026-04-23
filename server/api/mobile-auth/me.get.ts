import { getBearerTokenFromEvent, verifyMobileAccessToken } from '../../utils/mobileAuth'

export default defineEventHandler(async (event) => {
  const bearer = getBearerTokenFromEvent(event)
  if (!bearer) {
    throw createError({ statusCode: 401, statusMessage: 'Missing bearer token.' })
  }

  let claims
  try {
    claims = await verifyMobileAccessToken(bearer)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid mobile access token.' })
  }
  return {
    id: claims.sub,
    email: claims.email,
    name: claims.name,
    groups: claims.groups,
  }
})

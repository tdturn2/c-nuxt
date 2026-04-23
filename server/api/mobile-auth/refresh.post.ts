import { issueMobileAccessToken, issueMobileRefreshToken, verifyMobileRefreshToken } from '../../utils/mobileAuth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ refreshToken?: string }>(event)
  const refreshToken = (body?.refreshToken || '').trim()

  if (!refreshToken) {
    throw createError({ statusCode: 400, statusMessage: 'refreshToken is required.' })
  }

  let claims
  try {
    claims = await verifyMobileRefreshToken(refreshToken)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid refresh token.' })
  }

  const nextAccessToken = await issueMobileAccessToken({
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    groups: claims.groups,
  })

  const nextRefreshToken = await issueMobileRefreshToken({
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    groups: claims.groups,
  })

  return {
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    tokenType: 'Bearer',
    expiresIn: 60 * 30,
    refreshExpiresIn: 60 * 60 * 24 * 14,
  }
})

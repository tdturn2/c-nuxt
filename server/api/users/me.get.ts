// GET current user from session (Entra). No connect-user ID needed by client.
import { defineEventHandler, createError } from 'h3'
import { authenticateWithConnectApi } from '../../utils/payloadAuth'
import { normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'
import { applyImpersonationToUser } from '../../utils/impersonation'

export default defineEventHandler(async (event) => {
  const { email } = await authenticateWithConnectApi(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing CONNECT_API'
    })
  }

  try {
    // connect-api list depth defaults to 0 (ID-only relations). Need depth=1 for avatar.url.
    const response = await $fetch(
      `${connectApiUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}&limit=1&depth=1`,
    ) as { docs: any[] }
    const user = response?.docs?.[0]
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    user.avatar = normalizeUserAvatar(user)
    return applyImpersonationToUser(event, user, email)
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch current user',
      data: err.data
    })
  }
})

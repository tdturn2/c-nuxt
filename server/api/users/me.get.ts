// GET current user from session (Entra). No Payload ID needed by client.
import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Payload base URL configuration'
    })
  }

  try {
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}&limit=1`) as { docs: any[] }
    const user = response?.docs?.[0]
    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Prefer new avatar relation, fallback to legacy avatar to keep UI contract stable.
    user.avatar = user.avatarConnectUserMedia || user.avatar || null
    if (user.avatar?.url && !user.avatar.url.startsWith('http')) {
      user.avatar.url = user.avatar.url.startsWith('/')
        ? `${payloadBaseUrl}${user.avatar.url}`
        : `${payloadBaseUrl}/${user.avatar.url}`
    }
    return user
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch current user',
      data: err.data
    })
  }
})

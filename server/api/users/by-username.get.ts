import { defineEventHandler, getQuery, createError } from 'h3'
import { sanitizeAlumniContact } from '../../utils/alumniProfile'
import { normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const username = query.username as string

  if (!username) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Username is required'
    })
  }

  const connectApiUrl = resolveConnectApiUrl()

  try {
    const email = `${username}@asburyseminary.edu`

    const response = await $fetch(
      `${connectApiUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}&limit=1&depth=1`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ) as { docs: Array<{
      id: number
      name: string
      email: string
      bio: string | null
      avatar?: { url: string } | null
      avatarConnectUserMedia?: { url: string } | null
      alumniOptIn?: boolean
      alumniDegrees?: Array<{ degree?: string; graduationYear?: number | string }>
      alumniContact?: {
        email?: string | null
        phone?: string | null
        facebook?: string | null
        x?: string | null
        instagram?: string | null
      } | null
    }> }

    const user = response?.docs?.[0]

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    user.avatar = normalizeUserAvatar(user)

    const normalizedContact = sanitizeAlumniContact(user.alumniContact)
    user.alumniContact = user.alumniOptIn ? normalizedContact : {
      email: null,
      phone: null,
      facebook: null,
      x: null,
      instagram: null,
    }

    return user
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch user by username: ${error.message}`
    })
  }
})

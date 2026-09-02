import { createError, defineEventHandler, getRouterParam } from 'h3'
import { normalizePublicationDoc, normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const payloadBaseUrl = resolveConnectApiUrl()

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required',
    })
  }

  if (!payloadBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing CONNECT_API',
    })
  }

  try {
    const user = await $fetch(`${payloadBaseUrl}/api/connect-users/${id}?depth=1`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }) as any

    user.avatar = normalizeUserAvatar(user)

    if (Array.isArray(user.publications)) {
      user.publications = user.publications.map((pub: any) => normalizePublicationDoc(pub))
    }

    return user
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: `User ${id} not found in connect-users`,
      })
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch user ${id} from connect-users: ${error.message || 'Unknown error'}`,
    })
  }
})

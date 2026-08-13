import { defineEventHandler, getQuery, createError } from 'h3'
import { normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((role) => String(role).trim().toLowerCase()).filter(Boolean)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = typeof query.q === 'string' ? query.q.trim() : ''

  if (!searchQuery) {
    return { docs: [] }
  }

  const connectApiUrl = resolveConnectApiUrl()

  try {
    const response = await $fetch(`${connectApiUrl}/api/connect-users`, {
      headers: { 'Content-Type': 'application/json' },
      query: {
        limit: 15,
        depth: 1,
        sort: 'name',
        'where[or][0][name][contains]': searchQuery,
        'where[or][1][email][contains]': searchQuery,
      },
    }) as { docs: Array<{ id: number; name: string; email: string; roles?: string[]; avatar?: { url: string } | null }> }

    const users = response.docs.map((user) => {
      const avatar = normalizeUserAvatar(user)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: normalizeRoles(user.roles),
        avatar: avatar?.url ?? null,
      }
    })

    return { docs: users }
  } catch (error: any) {
    console.error('Error searching users:', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to search users: ${error.message}`,
    })
  }
})

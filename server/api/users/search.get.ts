import { defineEventHandler, getQuery, createError } from 'h3'

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

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users`, {
      headers: { 'Content-Type': 'application/json' },
      query: {
        limit: 15,
        sort: 'name',
        'where[or][0][name][contains]': searchQuery,
        'where[or][1][email][contains]': searchQuery,
      },
    }) as { docs: Array<{ id: number; name: string; email: string; roles?: string[]; avatar?: { url: string } | null }> }

    const users = response.docs.map((user) => {
      const avatar = (user as any).avatarConnectUserMedia || user.avatar || null
      let avatarUrl = avatar?.url || null

      if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        avatarUrl = avatarUrl.startsWith('/')
          ? `${payloadBaseUrl}${avatarUrl}`
          : `${payloadBaseUrl}/${avatarUrl}`
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: normalizeRoles(user.roles),
        avatar: avatarUrl,
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

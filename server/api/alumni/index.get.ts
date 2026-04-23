// GET alumni directory users: connect-users with alumni permissions/groups.
import { createError, defineEventHandler } from 'h3'
import { normalizeAlumniDegrees } from '../../utils/alumniProfile'

type ConnectGroupLike = {
  slug?: string | null
  name?: string | null
}

function hasAlumniPermission(user: any): boolean {
  const roles = Array.isArray(user?.roles) ? user.roles.map((r: unknown) => String(r).toLowerCase()) : []
  if (roles.includes('alumni')) return true

  const groups: ConnectGroupLike[] = Array.isArray(user?.groups) ? user.groups : []
  return groups.some((group) => {
    const slug = String(group?.slug ?? '').toLowerCase()
    const name = String(group?.name ?? '').toLowerCase()
    return slug.includes('alumni') || name.includes('alumni')
  })
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users`, {
      headers: { 'Content-Type': 'application/json' },
      query: { limit: 500, depth: 1 },
    }) as { docs?: any[] }

    const allDocs = response?.docs ?? []
    const docs = allDocs.filter(hasAlumniPermission)
    const payloadBase = payloadBaseUrl

    const alumni = docs.map((user: any) => {
      const avatar = user.avatarConnectUserMedia || user.avatar || null
      let avatarUrl = avatar?.url ?? null
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        avatarUrl = avatarUrl.startsWith('/') ? `${payloadBase}${avatarUrl}` : `${payloadBase}/${avatarUrl}`
      }
      return {
        id: user.id,
        name: user.name,
        email: user.email ?? null,
        degrees: normalizeAlumniDegrees(user.alumniDegrees),
        avatar: avatarUrl ? { url: avatarUrl } : null,
      }
    })

    return { alumni }
  } catch (err: any) {
    console.error('Alumni Directory API Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load alumni directory',
      data: err.data,
    })
  }
})

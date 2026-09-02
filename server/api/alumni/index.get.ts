// GET alumni directory users: connect-users with alumni permissions/groups.
import { sortDirectoryByLastName } from '@shared/directoryNameSort'
import { createError, defineEventHandler } from 'h3'
import { normalizeAlumniDegrees } from '../../utils/alumniProfile'
import { normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'

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
  const connectApiUrl = resolveConnectApiUrl()

  try {
    const response = await $fetch(`${connectApiUrl}/api/connect-users`, {
      headers: { 'Content-Type': 'application/json' },
      query: { limit: 500, depth: 1 },
    }) as { docs?: any[] }

    const allDocs = response?.docs ?? []
    const docs = allDocs.filter(hasAlumniPermission)

    const alumni = docs.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email ?? null,
      degrees: normalizeAlumniDegrees(user.alumniDegrees),
      avatar: normalizeUserAvatar(user),
    }))

    return { alumni: sortDirectoryByLastName(alumni) }
  } catch (err: any) {
    console.error('Alumni Directory API Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load alumni directory',
      data: err.data,
    })
  }
})

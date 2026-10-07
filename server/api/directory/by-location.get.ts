import { canPublishStudentProfile } from '@shared/studentProfileAccess'
import { sortDirectoryByLastName } from '@shared/directoryNameSort'
import { createError, defineEventHandler } from 'h3'
import { normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'

type ConnectGroupLike = {
  slug?: string | null
  name?: string | null
}

function rolesOf(user: any): string[] {
  return Array.isArray(user?.roles) ? user.roles.map((r: unknown) => String(r).toLowerCase()) : []
}

function hasAlumniPermission(user: any): boolean {
  const roles = rolesOf(user)
  if (roles.includes('alumni')) return true
  const groups: ConnectGroupLike[] = Array.isArray(user?.groups) ? user.groups : []
  return groups.some((group) => {
    const slug = String(group?.slug ?? '').toLowerCase()
    const name = String(group?.name ?? '').toLowerCase()
    return slug.includes('alumni') || name.includes('alumni')
  })
}

function isDirectoryVisible(user: any): boolean {
  const roles = rolesOf(user)
  if (roles.includes('staff') || roles.includes('faculty') || roles.includes('admin')) return true
  if (hasAlumniPermission(user)) return true
  if (roles.includes('student')) {
    return canPublishStudentProfile({ roles, studentOptIn: user?.studentOptIn })
  }
  return false
}

function roleLabels(user: any): string[] {
  const roles = rolesOf(user)
  const labels: string[] = []
  if (roles.includes('faculty')) labels.push('Faculty')
  if (roles.includes('staff')) labels.push('Staff')
  if (roles.includes('student') && canPublishStudentProfile({ roles, studentOptIn: user?.studentOptIn })) {
    labels.push('Student')
  }
  if (hasAlumniPermission(user)) labels.push('Alumni')
  return labels
}

export default defineEventHandler(async () => {
  const connectApiUrl = resolveConnectApiUrl()

  try {
    const response = await $fetch(`${connectApiUrl}/api/connect-users`, {
      headers: { 'Content-Type': 'application/json' },
      query: { limit: 500, depth: 1 },
    }) as { docs?: any[] }

    const people = (response?.docs ?? [])
      .filter((user: any) => {
        const country = String(user?.country ?? '').trim()
        return country.length > 0 && isDirectoryVisible(user)
      })
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email ?? null,
        employeeTitle: user.employeeTitle ?? null,
        country: String(user.country).trim().toUpperCase(),
        region: user.region ? String(user.region).trim().toUpperCase() : null,
        city: user.city ? String(user.city).trim() : null,
        roles: roleLabels(user),
        avatar: normalizeUserAvatar(user),
      }))

    return { people: sortDirectoryByLastName(people) }
  } catch (err: any) {
    console.error('By-location directory API error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load location directory',
      data: err.data,
    })
  }
})

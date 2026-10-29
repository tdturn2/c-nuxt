// GET students: connect-users with role student.
import { canPublishStudentProfile } from '@shared/studentProfileAccess'
import { sortDirectoryByLastName } from '@shared/directoryNameSort'
import { defineEventHandler, createError } from 'h3'
import { normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'

export default defineEventHandler(async () => {
  const connectApiUrl = resolveConnectApiUrl()

  try {
    // The user list is paged. A single page of 500 drops later names before the
    // student opt-in filter runs (analytics counted 31; the first page held 14).
    const allDocs: any[] = []
    let page = 1
    let totalPages = 1
    do {
      const response = await $fetch<{ docs?: any[]; totalPages?: number }>(`${connectApiUrl}/api/connect-users`, {
        headers: { 'Content-Type': 'application/json' },
        query: { limit: 500, page, depth: 1 },
      })
      allDocs.push(...(response?.docs ?? []))
      totalPages = Number(response?.totalPages) || 1
      page += 1
    } while (page <= totalPages && page <= 20)

    const roles = (r: unknown): string[] => (Array.isArray(r) ? r.map(String) : [])
    const docs = allDocs.filter((user: any) => {
      const userRoles = roles(user?.roles)
      return userRoles.includes('student') && canPublishStudentProfile({
        roles: userRoles,
        studentOptIn: user?.studentOptIn,
      })
    })

    const students = docs.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email ?? null,
      country: user.country ?? null,
      region: user.region ?? null,
      city: user.city ?? null,
      avatar: normalizeUserAvatar(user),
    }))

    return { students: sortDirectoryByLastName(students) }
  } catch (err: any) {
    console.error('Students API Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load students',
      data: err.data,
    })
  }
})

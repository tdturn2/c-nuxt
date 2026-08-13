// GET employees: connect-users with role staff or faculty.
import { defineEventHandler, createError } from 'h3'
import { normalizeUserAvatar, resolveConnectApiUrl } from '../../utils/connectApi'

export default defineEventHandler(async () => {
  const connectApiUrl = resolveConnectApiUrl()

  try {
    const response = await $fetch(`${connectApiUrl}/api/connect-users`, {
      headers: { 'Content-Type': 'application/json' },
      query: { limit: 500, depth: 1 },
    }) as { docs?: any[] }

    const allDocs = response?.docs ?? []
    const roles = (r: unknown): string[] => (Array.isArray(r) ? r.map(String) : [])
    const docs = allDocs.filter((user: any) => {
      const r = roles(user?.roles)
      return r.includes('staff') || r.includes('faculty')
    })

    const employees = docs.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      employeeTitle: user.employeeTitle ?? null,
      department: user.department ?? null,
      section: user.section ?? null,
      phone: user.phone ?? null,
      avatar: normalizeUserAvatar(user),
    }))

    return { employees }
  } catch (err: any) {
    console.error('Employees API Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load employees',
      data: err.data,
    })
  }
})

// GET faculty: connect-users with role faculty.
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users`, {
      headers: { 'Content-Type': 'application/json' },
      query: { limit: 500, depth: 1 }
    }) as { docs?: any[] }

    const allDocs = response?.docs ?? []
    const roles = (r: unknown): string[] => Array.isArray(r) ? r.map(String) : []
    const docs = allDocs.filter((user: any) => roles(user?.roles).includes('faculty'))
    const payloadBase = payloadBaseUrl

    const faculty = docs.map((user: any) => {
      const avatar = user.avatarConnectUserMedia || user.avatar || null
      let avatarUrl = avatar?.url ?? null
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        avatarUrl = avatarUrl.startsWith('/') ? `${payloadBase}${avatarUrl}` : `${payloadBase}/${avatarUrl}`
      }
      return {
        id: user.id,
        name: user.name,
        email: user.email ?? null,
        employeeTitle: user.employeeTitle ?? null,
        department: user.department ?? null,
        section: user.section ?? null,
        phone: user.phone ?? null,
        avatar: avatarUrl ? { url: avatarUrl } : null
      }
    })

    return { faculty }
  } catch (err: any) {
    console.error('Faculty API Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load faculty',
      data: err.data
    })
  }
})

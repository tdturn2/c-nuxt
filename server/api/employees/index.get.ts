// GET all employees. Proxies to Payload GET /api/connect-users/employees.
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  try {
    const response = await $fetch(`${payloadBaseUrl}/api/connect-users/employees`, {
      headers: { 'Content-Type': 'application/json' }
    }) as { docs?: any[]; employees?: any[] } | any[]

    const docs = Array.isArray(response)
      ? response
      : (response?.docs ?? response?.employees ?? [])
    const payloadBase = payloadBaseUrl

    const employees = docs.map((user: any) => {
      let avatarUrl = user.avatar?.url ?? null
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        avatarUrl = avatarUrl.startsWith('/') ? `${payloadBase}${avatarUrl}` : `${payloadBase}/${avatarUrl}`
      }
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeTitle: user.employeeTitle ?? null,
        department: user.department ?? null,
        section: user.section ?? null,
        phone: user.phone ?? null,
        avatar: avatarUrl ? { url: avatarUrl } : null
      }
    })

    return { employees }
  } catch (err: any) {
    console.error('Employees API Error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load employees',
      data: err.data
    })
  }
})

// PATCH degree. Auth: SSO. Forward to Payload PATCH /api/degrees/:id.
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Degree ID is required' })

  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const body = await readBody(event).catch(() => ({}))
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const result = await $fetch<any>(`${payloadBaseUrl}/api/degrees/${id}`, {
      method: 'PATCH',
      headers,
      body,
    })
    return result
  } catch (err: any) {
    console.error('Degrees PATCH error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to update degree',
      data: err.data,
    })
  }
})

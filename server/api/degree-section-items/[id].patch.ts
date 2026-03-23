// PATCH degree-section-item. Auth: SSO. Forward to Payload PATCH /api/degree-section-items/:id.
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const body = await readBody(event).catch(() => ({})) as Record<string, unknown>
  const payloadBody = { ...body, email }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/degree-section-items/${id}`, {
      method: 'PATCH',
      headers,
      body: payloadBody,
    })
  } catch (err: any) {
    console.error('Degree-section-items PATCH error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to update degree section item',
      data: err.data,
    })
  }
})

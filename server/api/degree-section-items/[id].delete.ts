// DELETE degree-section-item. Auth: SSO. Forward to Payload DELETE /api/degree-section-items/:id.
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/degree-section-items/${id}`, {
      method: 'DELETE',
      headers,
      query: { email },
    })
  } catch (err: any) {
    console.error('Degree-section-items DELETE error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to delete degree section item',
      data: err.data,
    })
  }
})

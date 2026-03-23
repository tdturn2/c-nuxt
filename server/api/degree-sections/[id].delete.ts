// DELETE degree-section. Auth: SSO. Forward to Payload DELETE /api/degree-sections/:id.
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
    return await $fetch<any>(`${payloadBaseUrl}/api/degree-sections/${id}`, {
      method: 'DELETE',
      headers,
    })
  } catch (err: any) {
    console.error('Degree-sections DELETE error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to delete degree section',
      data: err.data,
    })
  }
})

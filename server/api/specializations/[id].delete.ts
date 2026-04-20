// DELETE specialization. Auth: SSO. Forward to Payload DELETE /api/specializations/:id with email hint.
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID is required' })

  const auth = await authenticateWithPayloadCMS(event)
  const { email } = auth
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) throw createError({ statusCode: 500, statusMessage: 'Missing Payload base URL' })
  const headers = getPayloadProxyHeaders(event, auth)

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/specializations/${id}`, {
      method: 'DELETE',
      headers,
      query: { email },
    })
  } catch (err: any) {
    console.error('Specializations DELETE error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to delete specialization',
      data: err.data,
    })
  }
})

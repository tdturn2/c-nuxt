// POST create specialization. Auth: SSO. Forward to Payload POST /api/specializations.
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const body = await readBody(event).catch(() => ({}))
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/specializations`, {
      method: 'POST',
      headers,
      body,
    })
  } catch (err: any) {
    console.error('Specializations create error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to create specialization',
      data: err.data,
    })
  }
})

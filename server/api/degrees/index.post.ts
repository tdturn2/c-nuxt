// POST create degree. Auth: SSO. Forward to Payload POST /api/degrees.
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  const body = await readBody(event).catch(() => ({}))
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const result = await $fetch<any>(`${payloadBaseUrl}/api/degrees`, {
      method: 'POST',
      headers,
      body,
    })
    return result
  } catch (err: any) {
    console.error('Degrees create error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to create degree',
      data: err.data,
    })
  }
})

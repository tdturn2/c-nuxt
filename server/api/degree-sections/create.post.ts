// POST create degree-section via Payload custom endpoint. Auth: SSO; email in body.
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const body = await readBody(event).catch(() => ({})) as Record<string, unknown>
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const payloadBody = { ...body, email }

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/degree-sections/create`, {
      method: 'POST',
      headers,
      body: payloadBody,
    })
  } catch (err: any) {
    console.error('Degree-sections create error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to create degree section',
      data: err.data,
    })
  }
})

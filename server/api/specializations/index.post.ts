// POST create specialization. Auth: SSO. Forward to Payload POST /api/specializations/create.
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const auth = await authenticateWithPayloadCMS(event)
  const { email } = auth
  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  if (!payloadBaseUrl) throw createError({ statusCode: 500, statusMessage: 'Missing Payload base URL' })

  const body = await readBody(event).catch(() => ({})) as Record<string, unknown>
  const headers = getPayloadProxyHeaders(event, auth)

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/specializations/create`, {
      method: 'POST',
      headers,
      body: { ...body, email },
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

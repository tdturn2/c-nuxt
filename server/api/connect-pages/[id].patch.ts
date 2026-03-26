import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() || 'http://localhost:3002'

  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  const body = await readBody(event).catch(() => ({}))
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    return await $fetch(`${payloadBaseUrl}/api/connect-pages/${id}`, {
      method: 'PATCH',
      headers,
      body,
    })
  } catch (err: any) {
    console.error('connect-pages update error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to update page',
      data: err?.data,
    })
  }
})


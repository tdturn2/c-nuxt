import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { token, email: sessionEmail } = await authenticateWithPayloadCMS(event)
  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing id' })
  }

  // Detect admin-style Payload session: token that can access /api/users/me.
  let isAdminTokenSession = false
  if (token) {
    try {
      await $fetch(`${payloadBaseUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      isAdminTokenSession = true
    } catch {
      isAdminTokenSession = false
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (isAdminTokenSession && token) headers.Authorization = `Bearer ${token}`

  try {
    const url = isAdminTokenSession
      ? `${payloadBaseUrl}/api/connect-pages/${encodeURIComponent(id)}`
      : `${payloadBaseUrl}/api/connect-pages/delete/${encodeURIComponent(id)}`

    return await $fetch(url, {
      method: 'DELETE',
      headers,
      body: isAdminTokenSession ? undefined : { email: sessionEmail },
    })
  } catch (err: any) {
    console.error('connect-pages delete error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to delete page',
      data: err?.data,
    })
  }
})


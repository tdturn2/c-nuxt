import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { email: sessionEmail } = await authenticateWithPayloadCMS(event)
  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const res: any = await $fetch(
    `${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(sessionEmail)}&limit=1&depth=1`,
  ).catch((err: any) => {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to load connect-user',
      data: err?.data,
    })
  })

  const doc = Array.isArray(res?.docs) ? res.docs[0] : null
  return { doc }
})


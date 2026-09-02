import { defineEventHandler, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'
import { applyImpersonationToUser } from '../../utils/impersonation'

export default defineEventHandler(async (event) => {
  const { email: sessionEmail } = await authenticateWithPayloadCMS(event)
  if (!sessionEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.connectApi || config.public.connectApi || '').trim() ||
    (import.meta.dev ? 'http://localhost:3003' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
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
  const overlaid = applyImpersonationToUser(event, doc, sessionEmail)
  return {
    doc: overlaid,
    impersonation: overlaid?.impersonation ?? { active: false },
  }
})


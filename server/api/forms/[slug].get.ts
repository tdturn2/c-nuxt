import { defineEventHandler, createError, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { token, email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
  }

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Form slug is required' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const url =
    `${payloadBaseUrl}/api/connect-forms` +
    `?where[slug][equals]=${encodeURIComponent(slug)}` +
    `&limit=1`

  const res: any = await $fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).catch((err: any) => {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to fetch form definition',
      data: err?.data,
    })
  })

  const doc = Array.isArray(res?.docs) ? res.docs[0] : null
  return { doc }
})


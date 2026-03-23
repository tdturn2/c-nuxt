import { defineEventHandler, createError, getQuery } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'
import { getUserIdFromEmail } from '../../utils/getUserIdFromEmail'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')

  if (!payloadBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Payload base URL configuration'
    })
  }

  const { email } = await getSSOSession(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const ownerId = await getUserIdFromEmail(email, payloadBaseUrl)
  const query = getQuery(event)
  const kind = typeof query.kind === 'string' && query.kind.trim() ? query.kind.trim() : 'post-images'
  const limit = typeof query.limit === 'string' && /^\d+$/.test(query.limit) ? Number(query.limit) : 50
  const safeLimit = Math.min(Math.max(limit, 1), 200)

  try {
    const response = await $fetch(
      `${payloadBaseUrl}/api/connect-user-media?where[owner][equals]=${ownerId}&where[kind][equals]=${encodeURIComponent(kind)}&sort=-createdAt&limit=${safeLimit}`
    ) as { docs?: Array<{ id: number; url?: string; alt?: string; createdAt?: string }> }

    const docs = (response?.docs || []).map((doc) => {
      const url = doc.url
      const normalizedUrl = !url
        ? ''
        : url.startsWith('http')
          ? url
          : url.startsWith('/')
            ? `${payloadBaseUrl}${url}`
            : `${payloadBaseUrl}/${url}`

      return {
        id: doc.id,
        url: normalizedUrl,
        alt: doc.alt || '',
        createdAt: doc.createdAt || null
      }
    })

    return { docs }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch media gallery',
      data: error?.data
    })
  }
})

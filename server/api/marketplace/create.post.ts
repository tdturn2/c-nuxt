import { createError, defineEventHandler, readBody } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.connectApi || 'http://localhost:3003'
  const body = (await readBody(event).catch(() => ({}))) as Record<string, unknown>
  const { email } = await authenticateWithPayloadCMS(event)

  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    return await $fetch(`${payloadBaseUrl}/api/connect-marketplace-posts/create`, {
      method: 'POST',
      body: { ...body, email },
    })
  } catch (error: any) {
    const upstream =
      (typeof error?.data?.error === 'string' && error.data.error) ||
      (typeof error?.data?.message === 'string' && error.data.message) ||
      error?.statusMessage ||
      'Failed to create marketplace post'
    throw createError({
      statusCode: error.statusCode || error.status || 500,
      statusMessage: upstream,
      data: error.data,
    })
  }
})

import { createError, defineEventHandler, readBody } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
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
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create marketplace post',
      data: error.data,
    })
  }
})

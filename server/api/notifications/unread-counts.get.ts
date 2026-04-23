import { createError, defineEventHandler } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const { email } = await authenticateWithPayloadCMS(event)

  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return await $fetch(`${payloadBaseUrl}/api/connect-notifications/unread-counts`, {
    method: 'GET',
    query: { email },
  })
})

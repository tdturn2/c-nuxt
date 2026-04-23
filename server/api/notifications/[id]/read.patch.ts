import { createError, defineEventHandler, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS } from '../../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const { email } = await authenticateWithPayloadCMS(event)
  const id = getRouterParam(event, 'id')

  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Notification ID is required' })

  return await $fetch(`${payloadBaseUrl}/api/connect-notifications/mark-read/${id}`, {
    method: 'PATCH',
    query: { email },
  })
})

import { createError, defineEventHandler, getQuery } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const query = getQuery(event)
  const { email } = await authenticateWithPayloadCMS(event)

  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const type = query.type === 'mention' ? 'mention' : query.type === 'update' ? 'update' : undefined
  const page = typeof query.page === 'string' ? query.page : '1'
  const limit = typeof query.limit === 'string' ? query.limit : '25'

  return await $fetch(`${payloadBaseUrl}/api/connect-notifications/mine`, {
    method: 'GET',
    query: {
      email,
      type,
      page,
      limit,
    },
  })
})

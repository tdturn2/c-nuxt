import { createError, defineEventHandler, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const id = getRouterParam(event, 'id')
  const { email } = await authenticateWithPayloadCMS(event)

  if (!email) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Post id is required' })

  try {
    return await $fetch(`${payloadBaseUrl}/api/connect-marketplace-posts/delete/${id}`, {
      method: 'DELETE',
      body: { email },
    })
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete marketplace post',
      data: error.data,
    })
  }
})

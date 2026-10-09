import { createError, defineEventHandler, getRouterParam } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Record ID is required' })
  }

  const auth = await authenticateWithPayloadCMS(event)
  const { email } = auth
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl =
    (config.connectApi || config.public.connectApi || '').trim() ||
    (import.meta.dev ? 'http://localhost:3003' : '')

  try {
    return await $fetch(`${payloadBaseUrl}/api/student-course-records/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getPayloadProxyHeaders(event, auth),
      query: { email },
    })
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('Student course record DELETE error:', err)
    throw createError({
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || 'Failed to delete course record',
      data: err?.data,
    })
  }
})

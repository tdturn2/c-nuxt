import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { getSSOSession } from '../../../utils/ssoAuth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Publication ID is required' })
  }

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

  const body = await readBody(event) as Record<string, any>
  const { email } = await getSSOSession(event)
  const effectiveEmail = body?.email || email
  if (!effectiveEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const payload: Record<string, any> = { ...body, email: effectiveEmail }
    const response = await $fetch(`${payloadBaseUrl}/api/connect-user-publications/update/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    })
    return response
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to update publication',
      data: error?.data
    })
  }
})

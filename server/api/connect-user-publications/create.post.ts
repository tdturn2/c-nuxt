import { createError, defineEventHandler, readBody } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'

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

  const body = await readBody(event) as Record<string, any>
  const { email } = await getSSOSession(event)
  const effectiveEmail = body?.email || email
  if (!effectiveEmail) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const payload: Record<string, any> = { ...body, email: effectiveEmail }
    const response = await $fetch(`${payloadBaseUrl}/api/connect-user-publications/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    })
    return response
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to create publication',
      data: error?.data
    })
  }
})

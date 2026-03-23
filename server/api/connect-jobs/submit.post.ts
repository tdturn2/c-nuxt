// POST submit a job. Auth: SSO; email in body for submittedBy.
import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const { email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const body = await readBody(event).catch(() => ({})) as Record<string, unknown>
  const payloadBody = { ...body, email }

  try {
    return await $fetch<any>(`${payloadBaseUrl}/api/connect-jobs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadBody,
    })
  } catch (err: any) {
    console.error('Connect-jobs submit error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to submit job',
      data: err.data,
    })
  }
})

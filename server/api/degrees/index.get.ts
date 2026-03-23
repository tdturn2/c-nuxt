// GET list of degrees from Payload. Auth: SSO session. Access: staff (enforced by Payload bundle; list may be open).
import { defineEventHandler, createError, getQuery } from 'h3'
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

  const query = getQuery(event)
  const limit = query.limit ? String(query.limit) : '500'
  const sort = (query.sort as string) || 'id'

  try {
    const response = await $fetch<any>(`${payloadBaseUrl}/api/degrees`, {
      query: { limit, sort },
      headers: { 'Content-Type': 'application/json' },
    })
    return response
  } catch (err: any) {
    console.error('Degrees list API error:', err)
    if (err.statusCode) throw err
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to load degrees',
      data: err.data,
    })
  }
})

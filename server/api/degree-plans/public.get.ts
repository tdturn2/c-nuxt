import { createError, defineEventHandler, getQuery } from 'h3'
import { resolveConnectApiUrl } from '../../utils/connectApi'

export default defineEventHandler(async (event) => {
  const code = String(getQuery(event).code || '').trim()
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'A degree code is required' })
  }

  const payloadBaseUrl = resolveConnectApiUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  try {
    return await $fetch(`${payloadBaseUrl}/api/degree-plans/public`, {
      query: { code },
    })
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || err.status || 502,
      statusMessage: err.statusMessage || err.data?.error || 'Failed to load degree map',
    })
  }
})

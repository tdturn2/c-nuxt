import { createError, defineEventHandler, getQuery } from 'h3'
import { resolveConnectApiUrl } from '../../utils/connectApi'

export default defineEventHandler(async (event) => {
  const payloadBaseUrl = resolveConnectApiUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }
  const query = getQuery(event)
  const date = typeof query.date === 'string' ? query.date.trim() : ''
  const search = new URLSearchParams()
  if (date) search.set('date', date)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  try {
    return await $fetch(`${payloadBaseUrl}/api/campus-hours/week${suffix}`)
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 502,
      statusMessage: error?.statusMessage || 'Failed to load campus hours',
      data: error?.data,
    })
  }
})

import { defineEventHandler, getQuery, createError } from 'h3'
import { resolveConnectApiUrl } from '../../utils/connectApi'

export default defineEventHandler(async (event) => {
  const connectApiUrl = resolveConnectApiUrl().replace(/\/+$/, '')
  if (!connectApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }

  const query = getQuery(event)
  const from = typeof query.from === 'string' ? query.from : ''
  const to = typeof query.to === 'string' ? query.to : ''

  try {
    return await $fetch(`${connectApiUrl}/api/chapel-calendar-themes`, {
      query: {
        from,
        to,
        active: 'true',
        limit: '100',
        sort: 'startDate',
      },
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || error?.response?.status || 500,
      statusMessage: error?.data?.message || error?.statusMessage || 'Failed to fetch chapel calendar themes',
      data: error?.data,
    })
  }
})

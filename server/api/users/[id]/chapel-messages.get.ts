// GET /api/users/:id/chapel-messages — active chapel episodes for a linked speaker.
import { createError, getRouterParam } from 'h3'
import { resolveConnectApiUrl } from '../../../utils/connectApi'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || !/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Connect API is not configured' })
  }

  try {
    return await $fetch(`${connectApiUrl}/api/chapel-podcasts/for-user/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('Chapel messages error:', err)
    throw createError({
      statusCode: err?.statusCode || err?.response?.status || 502,
      statusMessage: err?.statusMessage || 'Failed to load chapel messages',
      data: err?.data,
    })
  }
})

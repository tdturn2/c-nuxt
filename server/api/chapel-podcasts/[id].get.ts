// Proxy single episode (findByID) to Payload chapel-podcasts
import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Episode ID is required'
    })
  }

  try {
    const query = getQuery(event)
    const response = await $fetch(`${payloadBaseUrl}/api/chapel-podcasts/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      query
    })
    return response
  } catch (error: any) {
    if (error.statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Episode not found' })
    }
    console.error('Chapel podcast API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch chapel episode',
      data: error.data
    })
  }
})

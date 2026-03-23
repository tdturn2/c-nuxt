// GET one connect-job by id. Public only if published.
import { defineEventHandler, getRouterParam, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Job ID is required',
    })
  }

  try {
    const response = await $fetch(`${payloadBaseUrl}/api/connect-jobs/${id}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    return response
  } catch (err: any) {
    if (err.statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Job not found' })
    }
    console.error('Connect-jobs get error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to fetch job',
      data: err.data,
    })
  }
})

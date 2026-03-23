// GET connect-jobs list. Public: published only. Optional ?email= for staff returns all.
import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const query = getQuery(event)
  const url = `${payloadBaseUrl}/api/connect-jobs/list`

  try {
    const response = await $fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      query,
    })
    return response
  } catch (err: any) {
    console.error('Connect-jobs list error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to fetch jobs',
      data: err.data,
    })
  }
})

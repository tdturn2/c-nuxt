import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Post ID is required'
    })
  }

  try {
    const { email } = await getSSOSession(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to delete post'
      })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const response = await $fetch(`${payloadBaseUrl}/api/connect-posts/delete/${id}`, {
      method: 'DELETE',
      headers,
      body: { email }
    })

    return response
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      throw error
    }
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to delete post from PayloadCMS',
      data: error.data
    })
  }
})

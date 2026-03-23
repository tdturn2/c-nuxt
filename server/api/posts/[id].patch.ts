import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
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
    const body = await readBody(event) as {
      content?: any
      categories?: any
      audience?: any
      images?: any
      imagesConnectUserMedia?: any
    }

    const { email } = await getSSOSession(event)

    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to edit post'
      })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Build update payload - content, categories, audience, images. Email for SSO auth.
    const payload: any = { email }
    if (body.content) payload.content = body.content
    if (body.categories !== undefined) payload.categories = body.categories
    if (body.audience !== undefined) payload.audience = body.audience
    if (body.imagesConnectUserMedia !== undefined) {
      payload.imagesConnectUserMedia = body.imagesConnectUserMedia
    } else if (body.images !== undefined) {
      // Prefer new field but keep legacy compatibility for callers still sending `images`.
      payload.imagesConnectUserMedia = body.images
      payload.images = body.images
    }

    const response = await $fetch(`${payloadBaseUrl}/api/connect-posts/update/${id}`, {
      method: 'PATCH',
      headers,
      body: payload
    })

    return response
  } catch (error: any) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      throw error
    }
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to update post in PayloadCMS',
      data: error.data
    })
  }
})

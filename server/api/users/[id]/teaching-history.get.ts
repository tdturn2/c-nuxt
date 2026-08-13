export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.connectApi || 'http://localhost:3003'

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User ID is required',
    })
  }

  try {
    return await $fetch(`${payloadBaseUrl}/api/connect-users/${id}/teaching-history`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage:
        error?.data?.error || error?.statusMessage || 'Failed to fetch teaching history',
      data: error?.data,
    })
  }
})

import { createError, defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const params = new URLSearchParams()
  params.set('where[active][equals]', 'true')
  params.set('sort', '-updatedAt')
  params.set('limit', '1')
  params.set('depth', '1')

  try {
    const res: any = await $fetch(`${payloadBaseUrl}/api/chapel-speakers?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    const speaker = Array.isArray(res?.docs) ? res.docs[0] || null : null
    return { speaker }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch current chapel speaker',
      data: error?.data,
    })
  }
})

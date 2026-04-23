import { createError, defineEventHandler, getRouterParam } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const id = getRouterParam(event, 'id')
  const { email } = await getSSOSession(event)

  if (!id) throw createError({ statusCode: 400, statusMessage: 'Post id is required' })

  try {
    const doc = await $fetch<any>(`${payloadBaseUrl}/api/connect-marketplace-posts/item/${id}`, {
      query: {
        email: email || undefined,
      },
    })

    if (Array.isArray(doc?.media)) {
      doc.media = doc.media.map((media: any) => {
        if (media && typeof media === 'object' && typeof media.url === 'string' && !media.url.startsWith('http')) {
          media.url = media.url.startsWith('/') ? `${payloadBaseUrl}${media.url}` : `${payloadBaseUrl}/${media.url}`
        }
        return media
      })
    }

    return doc
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch marketplace post',
      data: error.data,
    })
  }
})

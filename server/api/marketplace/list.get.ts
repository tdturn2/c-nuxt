import { createError, defineEventHandler, getQuery } from 'h3'
import { getSSOSession } from '../../utils/ssoAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const query = getQuery(event)
  const { email } = await getSSOSession(event)

  try {
    const response = await $fetch<any>(`${payloadBaseUrl}/api/connect-marketplace-posts/list`, {
      query: {
        ...query,
        email: email || undefined,
      },
    })

    if (Array.isArray(response?.docs)) {
      response.docs = response.docs.map((doc: any) => {
        if (Array.isArray(doc.media)) {
          doc.media = doc.media.map((media: any) => {
            if (media && typeof media === 'object' && typeof media.url === 'string' && !media.url.startsWith('http')) {
              media.url = media.url.startsWith('/') ? `${payloadBaseUrl}${media.url}` : `${payloadBaseUrl}/${media.url}`
            }
            return media
          })
        }
        return doc
      })
    }

    return response
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch marketplace posts',
      data: error.data,
    })
  }
})

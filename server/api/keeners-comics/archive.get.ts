import { createError, defineEventHandler, getQuery } from 'h3'
import { resolveConnectApiUrl, toBrowserMediaUrl } from '../../utils/connectApi'

type Comic = {
  id: number
  url?: string | null
  alt?: string
  filename?: string | null
  width?: number | null
  height?: number | null
}

const PAGE_SIZE = 50

export default defineEventHandler(async (event) => {
  const payloadBaseUrl = resolveConnectApiUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'CONNECT_API is not configured' })
  }

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(PAGE_SIZE, Math.max(1, Number(query.limit) || PAGE_SIZE))

  try {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('page', String(page))
    const res = await $fetch<{
      docs?: Comic[]
      totalDocs?: number
      page?: number
      limit?: number
      totalPages?: number
      hasNextPage?: boolean
      hasPrevPage?: boolean
    }>(`${payloadBaseUrl}/api/connect-keeners-comics/archive?${params.toString()}`)
    const docs = Array.isArray(res?.docs) ? res.docs : []
    return {
      ...res,
      docs: docs.map((comic) => ({
        ...comic,
        url: toBrowserMediaUrl(comic.url),
      })),
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch comics archive',
      data: error?.data,
    })
  }
})

import { createError, defineEventHandler } from 'h3'
import { resolveConnectApiUrl, toBrowserMediaUrl } from '../../utils/connectApi'

type Comic = {
  id: number
  url?: string | null
  alt?: string
  filename?: string | null
  width?: number | null
  height?: number | null
}

type TodayResponse = {
  date?: string
  comic?: Comic | null
}

export default defineEventHandler(async () => {
  const payloadBaseUrl = resolveConnectApiUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'CONNECT_API is not configured' })
  }

  try {
    const res = await $fetch<TodayResponse>(`${payloadBaseUrl}/api/connect-keeners-comics/today`)
    const comic = res?.comic
    if (!comic) return { date: res?.date || '', comic: null }
    return {
      date: res.date || '',
      comic: {
        ...comic,
        url: toBrowserMediaUrl(comic.url),
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch today\'s comic',
      data: error?.data,
    })
  }
})

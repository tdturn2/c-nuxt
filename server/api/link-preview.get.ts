import { createError, defineEventHandler, getQuery } from 'h3'
import { fetchAndCacheLinkPreview } from '../utils/linkPreview'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawUrl = typeof query.url === 'string' ? query.url.trim() : ''
  if (!rawUrl) {
    throw createError({ statusCode: 400, statusMessage: 'url query parameter is required' })
  }
  return await fetchAndCacheLinkPreview(rawUrl)
})

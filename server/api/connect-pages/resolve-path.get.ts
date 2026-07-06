import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import {
  connectPageHasUsableDetail,
  findConnectPageByPath,
  getDirectChildConnectPages,
  normalizeConnectPageLookupPath,
} from '@shared/connectPagesTreeCore'
import { fetchConnectPageDetail, getConnectPagesTreeDocs } from '../../utils/connectPagesTreeCache'

/** Resolve one page + direct children in a single server round-trip (tree cached server-side). */
export default defineEventHandler(async (event) => {
  const rawPath = String(getQuery(event).path || '').trim()
  if (!rawPath) {
    throw createError({ statusCode: 400, statusMessage: 'path query param is required' })
  }

  const path = normalizeConnectPageLookupPath(rawPath)
  const docs = await getConnectPagesTreeDocs(event)
  const match = findConnectPageByPath(docs, path)
  if (!match) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  let page = match
  if (!connectPageHasUsableDetail(match)) {
    page = await fetchConnectPageDetail(event, match.id)
  }

  const children = getDirectChildConnectPages(docs, match.id)
  setHeader(event, 'Cache-Control', 'private, max-age=30, stale-while-revalidate=120')

  return { page, children }
})

import { defineEventHandler, setHeader } from 'h3'
import { getConnectPagesTreeDocs } from '../../utils/connectPagesTreeCache'

/** Lightweight nav tree (depth 0). Paginated server-side with in-memory cache. */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  const docs = await getConnectPagesTreeDocs(event)
  return { docs }
})

import { defineEventHandler, getQuery } from 'h3'
import { resolveConnectApiUrl } from '../../utils/connectApi'

function sinceParam(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  return Number.isNaN(Date.parse(value)) ? undefined : value
}

function totalDocs(payload: unknown): number {
  if (!payload || typeof payload !== 'object') return 0
  const total = (payload as { totalDocs?: unknown }).totalDocs
  if (typeof total === 'number' && Number.isFinite(total)) return Math.max(0, Math.trunc(total))
  const docs = (payload as { docs?: unknown }).docs
  return Array.isArray(docs) ? docs.length : 0
}

/** Listings posted after the sidebar link was last opened. A failed upstream call hides that badge. */
export default defineEventHandler(async (event) => {
  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) return { marketplace: 0, jobs: 0 }

  const query = getQuery(event)
  const marketplaceSince = sinceParam(query.marketplaceSince)
  const jobsSince = sinceParam(query.jobsSince)

  const [marketplaceResult, jobsResult] = await Promise.allSettled([
    $fetch(`${connectApiUrl}/api/connect-marketplace-posts/list`, {
      query: { count: '1', limit: '1', since: marketplaceSince },
    }),
    $fetch(`${connectApiUrl}/api/connect-jobs/list`, {
      query: { count: '1', since: jobsSince },
    }),
  ])

  return {
    marketplace: marketplaceResult.status === 'fulfilled' ? totalDocs(marketplaceResult.value) : 0,
    jobs: jobsResult.status === 'fulfilled' ? totalDocs(jobsResult.value) : 0,
  }
})

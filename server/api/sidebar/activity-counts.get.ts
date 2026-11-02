import { defineEventHandler } from 'h3'
import { resolveConnectApiUrl } from '../../utils/connectApi'

function totalDocs(payload: unknown): number {
  if (!payload || typeof payload !== 'object') return 0
  const total = (payload as { totalDocs?: unknown }).totalDocs
  if (typeof total === 'number' && Number.isFinite(total)) return Math.max(0, Math.trunc(total))
  const docs = (payload as { docs?: unknown }).docs
  return Array.isArray(docs) ? docs.length : 0
}

/** Public listing totals for the sidebar. A failed upstream call hides that badge. */
export default defineEventHandler(async () => {
  const connectApiUrl = resolveConnectApiUrl()
  if (!connectApiUrl) return { marketplace: 0, jobs: 0 }

  const [marketplaceResult, jobsResult] = await Promise.allSettled([
    $fetch(`${connectApiUrl}/api/connect-marketplace-posts/list`, {
      query: { count: '1', limit: '1' },
    }),
    $fetch(`${connectApiUrl}/api/connect-jobs/list`, {
      query: { count: '1' },
    }),
  ])

  return {
    marketplace: marketplaceResult.status === 'fulfilled' ? totalDocs(marketplaceResult.value) : 0,
    jobs: jobsResult.status === 'fulfilled' ? totalDocs(jobsResult.value) : 0,
  }
})

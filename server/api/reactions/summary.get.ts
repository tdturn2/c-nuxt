import { createError, defineEventHandler, getQuery } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

type ReactionDoc = {
  post?: number | { id?: number }
  reactionType?: string
  user?: { email?: string }
}

function parsePostIds(raw: string | string[] | undefined): number[] {
  const first = Array.isArray(raw) ? raw[0] : raw
  if (!first) return []
  return first
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0)
}

function postIdFromReaction(doc: ReactionDoc): number | null {
  if (typeof doc.post === 'number') return doc.post
  if (typeof doc.post === 'object' && typeof doc.post?.id === 'number') return doc.post.id
  return null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const postIds = parsePostIds(query.postIds as string | string[] | undefined)
  if (!postIds.length) {
    return { byPostId: {} }
  }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

  const auth = await authenticateWithPayloadCMS(event)
  if (!auth.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - must be signed in' })
  }

  const headers = getPayloadProxyHeaders(event, auth)

  try {
    const response = (await $fetch(`${payloadBaseUrl}/api/connect-post-reactions`, {
      headers,
      query: {
        'where[post][in]': postIds.join(','),
        limit: 1000,
      },
    })) as { docs?: ReactionDoc[] }

    const docs = Array.isArray(response.docs) ? response.docs : []
    const byPostId: Record<number, { count: number; hasReacted: boolean; userReactionType: string | null; countsByType: Record<string, number> }> = {}
    for (const id of postIds) {
      byPostId[id] = { count: 0, hasReacted: false, userReactionType: null, countsByType: {} }
    }

    for (const doc of docs) {
      const postId = postIdFromReaction(doc)
      if (!postId || !byPostId[postId]) continue
      const type = (doc.reactionType || 'like').toLowerCase()
      byPostId[postId].count += 1
      byPostId[postId].countsByType[type] = (byPostId[postId].countsByType[type] || 0) + 1
      if ((doc.user?.email || '').toLowerCase() === auth.email.toLowerCase()) {
        byPostId[postId].hasReacted = true
        byPostId[postId].userReactionType = type
      }
    }

    return { byPostId }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch reactions summary',
      data: error?.data,
    })
  }
})

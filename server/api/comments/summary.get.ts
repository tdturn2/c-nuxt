import { createError, defineEventHandler, getHeader, getQuery } from 'h3'

function parsePostIds(raw: string | string[] | undefined): number[] {
  const first = Array.isArray(raw) ? raw[0] : raw
  if (!first) return []
  return first
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0)
}

type CommentDoc = {
  post?: number | { id?: number }
}

function postIdFromComment(doc: CommentDoc): number | null {
  if (typeof doc.post === 'number') return doc.post
  if (typeof doc.post === 'object' && typeof doc.post?.id === 'number') return doc.post.id
  return null
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const postIds = parsePostIds(query.postIds as string | string[] | undefined)
  if (!postIds.length) return { byPostId: {} }

  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const cookieHeader = getHeader(event, 'cookie')
  const authHeader = getHeader(event, 'authorization')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader) headers.Authorization = authHeader
  if (cookieHeader) headers.Cookie = cookieHeader

  try {
    const response = (await $fetch(`${payloadBaseUrl}/api/connect-comments`, {
      headers,
      query: {
        'where[post][in]': postIds.join(','),
        limit: 2000,
        depth: 0,
      },
    })) as { docs?: CommentDoc[] }

    const docs = Array.isArray(response.docs) ? response.docs : []
    const byPostId: Record<number, number> = {}
    for (const id of postIds) byPostId[id] = 0

    for (const doc of docs) {
      const postId = postIdFromComment(doc)
      if (!postId || byPostId[postId] === undefined) continue
      byPostId[postId] += 1
    }

    return { byPostId }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Failed to fetch comments summary',
      data: error?.data,
    })
  }
})

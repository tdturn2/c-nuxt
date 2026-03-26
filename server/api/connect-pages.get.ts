// Proxy to Payload CMS connect-pages collection. Forward query params (e.g. where[slug][equals], limit, depth).
import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() || 'http://localhost:3002'
  const query = getQuery(event)
  const searchParams = new URLSearchParams(query as Record<string, string>)
  const url = `${payloadBaseUrl}/api/connect-pages?${searchParams.toString()}`
  const toParentId = (parent: unknown): string | null => {
    if (parent == null) return null
    if (typeof parent === 'object') {
      const id = (parent as { id?: number | string }).id
      return id == null ? null : String(id)
    }
    return String(parent)
  }
  const normalizeDoc = (doc: any) => {
    if (!doc || typeof doc !== 'object') return doc
    const navCategory = typeof doc.navCategory === 'string'
      ? doc.navCategory.trim().toLowerCase()
      : null
    return {
      ...doc,
      navCategory,
      parentId: toParentId(doc.parent),
    }
  }
  try {
    const data: any = await $fetch(url)
    if (Array.isArray(data?.docs)) {
      return {
        ...data,
        docs: data.docs.map((doc: any) => normalizeDoc(doc)),
      }
    }
    return normalizeDoc(data)
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 502,
      statusMessage: err.statusMessage || 'Failed to fetch connect-pages',
    })
  }
})

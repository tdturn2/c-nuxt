import type { H3Event } from 'h3'
import { createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from './payloadAuth'

const TREE_TTL_MS = 5 * 60 * 1000
const TREE_PAGE_LIMIT = 100

let cachedTree: { at: number; docs: any[] } | null = null
let treeInFlight: Promise<any[]> | null = null

function payloadBaseUrlFromConfig() {
  const config = useRuntimeConfig()
  return (
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  )
}

async function fetchTreePage(
  payloadBaseUrl: string,
  headers: Record<string, string>,
  page: number,
) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(TREE_PAGE_LIMIT),
    depth: '0',
    sort: 'order,title',
  })
  return await $fetch<any>(`${payloadBaseUrl}/api/connect-pages?${searchParams.toString()}`, { headers })
}

async function loadConnectPagesTreeDocs(event: H3Event): Promise<any[]> {
  const payloadBaseUrl = payloadBaseUrlFromConfig()
  if (!payloadBaseUrl) return []

  const docs: any[] = []
  let page = 1
  let hasNextPage = true
  let guard = 0

  const { token, payloadSessionCookie } = await authenticateWithPayloadCMS(event)
  const headers = getPayloadProxyHeaders(event, { token, payloadSessionCookie }, { Accept: 'application/json' })

  while (hasNextPage && guard < 500) {
    const res = await fetchTreePage(payloadBaseUrl, headers, page)
    const chunk = Array.isArray(res?.docs) ? res.docs : []
    docs.push(...chunk)
    hasNextPage = Boolean(res?.hasNextPage)
    page = Number(res?.nextPage || page + 1)
    guard += 1
  }

  return docs
}

export async function getConnectPagesTreeDocs(event: H3Event, { force = false } = {}): Promise<any[]> {
  if (!force && cachedTree && Date.now() - cachedTree.at < TREE_TTL_MS) {
    return cachedTree.docs
  }

  if (!force && treeInFlight) {
    return await treeInFlight
  }

  const run = (async () => {
    const docs = await loadConnectPagesTreeDocs(event)
    cachedTree = { at: Date.now(), docs }
    return docs
  })()

  treeInFlight = run
  try {
    return await run
  } finally {
    treeInFlight = null
  }
}

export async function fetchConnectPageDetail(event: H3Event, id: string | number, depth = '2') {
  const payloadBaseUrl = payloadBaseUrlFromConfig()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const { token, payloadSessionCookie } = await authenticateWithPayloadCMS(event)
  const headers = getPayloadProxyHeaders(event, { token, payloadSessionCookie }, { Accept: 'application/json' })
  const url = `${payloadBaseUrl}/api/connect-pages/${encodeURIComponent(String(id))}?depth=${encodeURIComponent(depth)}`
  return await $fetch<any>(url, { headers })
}

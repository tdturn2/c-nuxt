import type { NavigationMenuItem } from '@nuxt/ui'
import {
  AUDIENCE_HUB_SLUGS,
  buildPagePathMap,
  buildPageTree,
  CONNECT_PAGE_CATEGORIES,
  connectPageHasUsableDetail,
  findConnectPageByPath,
  getConnectPageBreadcrumbLabel,
  getDirectChildConnectPages,
  hasRenderableConnectPageContent,
  isAudienceHubRootPage,
  normalizeConnectPage,
  normalizeConnectPageLookupPath,
  normalizeConnectPageSlug,
  normalizeParentId,
  sortConnectPages,
  type AudienceHubSlug,
  type ConnectPageCategory,
  type ConnectPageNode,
} from '@shared/connectPagesTreeCore'

export {
  AUDIENCE_HUB_SLUGS,
  CONNECT_PAGE_CATEGORIES,
  buildPagePathMap,
  buildPageTree,
  connectPageHasUsableDetail,
  findConnectPageByPath,
  getConnectPageBreadcrumbLabel,
  getDirectChildConnectPages,
  hasRenderableConnectPageContent,
  isAudienceHubRootPage,
  normalizeConnectPage,
  normalizeConnectPageLookupPath,
  normalizeConnectPageSlug,
  normalizeParentId,
  type AudienceHubSlug,
  type ConnectPageCategory,
  type ConnectPageNode,
}

/** Shared Nuxt payload key so sidebar + catchall page reuse one tree fetch. */
export const CONNECT_PAGES_TREE_KEY = 'connect-pages-tree'

const SESSION_TREE_KEY = 'connect-pages-tree-v1'
const SESSION_TREE_TTL_MS = 15 * 60 * 1000

export type ConnectPagesTreeData = { docs?: any[] }

/** Fast nav tree: one server call, depth 0, server-side pagination + cache. */
export async function fetchConnectPagesTree(): Promise<ConnectPagesTreeData> {
  return await $fetch<ConnectPagesTreeData>('/api/connect-pages/tree')
}

/** @deprecated Prefer fetchConnectPagesTree for nav; still used where full depth is required. */
export async function fetchAllConnectPages(query?: {
  depth?: number
  sort?: string
  limit?: number
}) {
  const docs: any[] = []
  const perPage = Math.max(1, query?.limit ?? 100)
  const depth = query?.depth ?? 2
  const sort = query?.sort ?? 'order,title'
  let page = 1
  let hasNextPage = true
  let guard = 0

  while (hasNextPage && guard < 500) {
    const res = await $fetch<any>('/api/connect-pages', {
      query: {
        page,
        limit: perPage,
        depth,
        sort,
      },
    })
    const chunk = Array.isArray(res?.docs) ? res.docs : []
    docs.push(...chunk)
    hasNextPage = Boolean(res?.hasNextPage)
    page = Number(res?.nextPage || page + 1)
    guard += 1
  }

  return { docs }
}

function readSessionTreeCache(): ConnectPagesTreeData | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(SESSION_TREE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at?: number; docs?: any[] }
    if (!parsed?.docs?.length || !parsed.at) return null
    if (Date.now() - parsed.at > SESSION_TREE_TTL_MS) return null
    return { docs: parsed.docs }
  } catch {
    return null
  }
}

function writeSessionTreeCache(data: ConnectPagesTreeData | null) {
  if (!import.meta.client || !data?.docs?.length) return
  try {
    sessionStorage.setItem(SESSION_TREE_KEY, JSON.stringify({ at: Date.now(), docs: data.docs }))
  } catch {}
}

/** Cached connect-pages tree for sidebar + department navigation. */
export function useConnectPagesTreeData() {
  return useAsyncData<ConnectPagesTreeData>(
    CONNECT_PAGES_TREE_KEY,
    async () => {
      const data = await fetchConnectPagesTree()
      writeSessionTreeCache(data)
      return data
    },
    {
      lazy: true,
      getCachedData(key, nuxtApp) {
        const fromPayload = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
        if (fromPayload) return fromPayload as ConnectPagesTreeData
        return readSessionTreeCache()
      },
    },
  )
}

export function buildConnectPageNavItems(rawPages: any[]): NavigationMenuItem[] {
  const tree = buildPageTree(rawPages)
  const { pathById } = buildPagePathMap(rawPages)

  const toMenuItem = (node: ReturnType<typeof buildPageTree>[number]): NavigationMenuItem | null => {
    const id = String(node.page.id)
    const path = pathById.get(id)
    const label = (node.page.title || node.page.slug || '').toString().trim() || `#${id}`
    const children = node.children.map(toMenuItem).filter((i): i is NavigationMenuItem => i != null)
    if (!path && !children.length) return null
    const out: NavigationMenuItem = { label }
    if (path) {
      out.to = path
      out.onSelect = () => navigateTo(path)
    }
    if (children.length) out.children = children
    return out
  }

  return tree.map(toMenuItem).filter((i): i is NavigationMenuItem => i != null)
}

export function buildConnectPageCategoryNavItems(rawPages: any[]): NavigationMenuItem[] {
  const pages = rawPages.map(normalizeConnectPage)
  const tree = buildPageTree(pages)
  const { pathById, byId } = buildPagePathMap(pages)

  const allowed = new Set<string>(CONNECT_PAGE_CATEGORIES.map((c) => c.value))
  const effectiveCategoryCache = new Map<string, ConnectPageCategory | null>()
  const getEffectiveCategory = (page: ConnectPageNode): ConnectPageCategory | null => {
    const pageId = String(page.id)
    if (effectiveCategoryCache.has(pageId)) return effectiveCategoryCache.get(pageId) ?? null
    const visited = new Set<string>()
    let current: ConnectPageNode | undefined = page
    while (current) {
      const category = current.navCategory
      if (category && allowed.has(category)) {
        effectiveCategoryCache.set(pageId, category as ConnectPageCategory)
        return category as ConnectPageCategory
      }
      const currentId = String(current.id)
      if (visited.has(currentId)) break
      visited.add(currentId)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    effectiveCategoryCache.set(pageId, null)
    return null
  }

  const toMenuItem = (node: ReturnType<typeof buildPageTree>[number]): NavigationMenuItem | null => {
    const id = String(node.page.id)
    const path = pathById.get(id)
    const label = (node.page.title || node.page.slug || '').toString().trim() || `#${id}`
    const children = node.children.map(toMenuItem).filter((i): i is NavigationMenuItem => i != null)
    if (!path && !children.length) return null
    const out: NavigationMenuItem = { label }
    if (path) {
      out.to = path
      out.onSelect = () => navigateTo(path)
    }
    if (children.length) out.children = children
    return out
  }

  const grouped = new Map<ConnectPageCategory, NavigationMenuItem[]>()
  for (const c of CONNECT_PAGE_CATEGORIES) grouped.set(c.value, [])

  for (const rootNode of tree) {
    if (isAudienceHubRootPage(rootNode.page)) continue
    const category = getEffectiveCategory(rootNode.page)
    if (!category) continue
    const item = toMenuItem(rootNode)
    if (!item) continue
    grouped.get(category)?.push(item)
  }

  return CONNECT_PAGE_CATEGORIES.map((c) => ({
    label: c.label,
    icon: 'i-lucide-folder-open',
    children: grouped.get(c.value) ?? [],
  }))
}

// Keep sortPages name for any external imports (alias).
export const sortPages = sortConnectPages

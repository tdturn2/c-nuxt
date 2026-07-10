import type { NavigationMenuItem } from '@nuxt/ui'
import {
  AUDIENCE_HUB_SLUGS,
  buildPagePathMap,
  buildPageTree,
  CONNECT_PAGE_CATEGORIES,
  CONNECT_PAGE_CATEGORY_PATHS,
  connectPageHasUsableDetail,
  findConnectPageByPath,
  getConnectPageBreadcrumbLabel,
  getDirectChildConnectPages,
  getConnectPageAncestors,
  getConnectPageSiblings,
  resolveEffectiveConnectPageCategory,
  resolveCategoryRootPage,
  buildConnectPageBreadcrumbs,
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
  type ConnectPageNavLink,
  type ConnectPageBreadcrumbItem,
} from '@shared/connectPagesTreeCore'

export {
  AUDIENCE_HUB_SLUGS,
  CONNECT_PAGE_CATEGORIES,
  CONNECT_PAGE_CATEGORY_PATHS,
  buildPagePathMap,
  buildPageTree,
  connectPageHasUsableDetail,
  findConnectPageByPath,
  getConnectPageBreadcrumbLabel,
  getDirectChildConnectPages,
  getConnectPageAncestors,
  getConnectPageSiblings,
  resolveEffectiveConnectPageCategory,
  resolveCategoryRootPage,
  buildConnectPageBreadcrumbs,
  hasRenderableConnectPageContent,
  isAudienceHubRootPage,
  normalizeConnectPage,
  normalizeConnectPageLookupPath,
  normalizeConnectPageSlug,
  normalizeParentId,
  type AudienceHubSlug,
  type ConnectPageCategory,
  type ConnectPageNode,
  type ConnectPageNavLink,
  type ConnectPageBreadcrumbItem,
}

/** Shared Nuxt payload key so sidebar + catchall page reuse one tree fetch. */
export const CONNECT_PAGES_TREE_KEY = 'connect-pages-tree'

export const CONNECT_PAGES_TREE_QUERY = {
  limit: 100,
  depth: 2,
  sort: 'order,title',
} as const

export type ConnectPagesTreeData = { docs?: any[] }

export async function fetchAllConnectPages(query?: {
  depth?: number
  sort?: string
  limit?: number
}) {
  const docs: any[] = []
  const perPage = Math.max(1, query?.limit ?? CONNECT_PAGES_TREE_QUERY.limit)
  const depth = query?.depth ?? CONNECT_PAGES_TREE_QUERY.depth
  const sort = query?.sort ?? CONNECT_PAGES_TREE_QUERY.sort
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

/** Load the full connect-pages tree (depth 2) for nav + department pages. */
export function useConnectPagesTreeData() {
  return useAsyncData<ConnectPagesTreeData>(
    CONNECT_PAGES_TREE_KEY,
    () => fetchAllConnectPages({ ...CONNECT_PAGES_TREE_QUERY }),
    { lazy: true },
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

  return CONNECT_PAGE_CATEGORIES.map((c) => {
    const path = CONNECT_PAGE_CATEGORY_PATHS[c.value]
    return {
      label: c.label,
      icon: 'i-lucide-folder-open',
      to: path,
      onSelect: () => navigateTo(path),
      children: grouped.get(c.value) ?? [],
    }
  })
}

function withNavTooltips(item: NavigationMenuItem): NavigationMenuItem {
  const label = String(item.label ?? '')
  return {
    ...item,
    title: label,
    children: item.children?.map(withNavTooltips),
  }
}

export function resolveNavCategoryForPath(rawPages: any[], path: string): ConnectPageCategory | null {
  const page = findConnectPageByPath(rawPages, path)
  if (!page || isAudienceHubRootPage(page)) return null

  const pages = rawPages.map(normalizeConnectPage)
  const byId = new Map(pages.map((p) => [String(p.id), p]))
  const allowed = new Set<string>(CONNECT_PAGE_CATEGORIES.map((c) => c.value))

  let current: ConnectPageNode | undefined = byId.get(String(page.id))
  const visited = new Set<string>()
  while (current) {
    const category = current.navCategory
    if (category && allowed.has(category)) return category as ConnectPageCategory
    const id = String(current.id)
    if (visited.has(id)) break
    visited.add(id)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return null
}

/** Flat local nav when viewing a department page — avoids 4-level category nesting. */
export function buildConnectPageContextualNavItems(
  rawPages: any[],
  path: string,
): NavigationMenuItem[] | null {
  const normalizedPath = normalizeConnectPageLookupPath(path)
  if (normalizedPath === '/internal') return null

  const page = findConnectPageByPath(rawPages, path)
  if (!page || isAudienceHubRootPage(page)) return null

  const pages = rawPages.map(normalizeConnectPage)
  const byId = new Map(pages.map((p) => [String(p.id), p]))
  const { pathById } = buildPagePathMap(pages)
  const current = byId.get(String(page.id))
  if (!current) return null

  const listParentId = current.parentId || String(current.id)
  const siblings = getDirectChildConnectPages(pages, listParentId)
  const items: NavigationMenuItem[] = [
    {
      label: 'All departments',
      icon: 'i-heroicons-arrow-left',
      to: '/internal',
    },
  ]

  if (current.parentId) {
    const parent = byId.get(current.parentId)
    const parentPath = pathById.get(current.parentId)
    const parentLabel = (parent?.title || parent?.slug || '').toString().trim()
    if (parent && parentPath && parentLabel) {
      items.push({
        label: parentLabel,
        icon: 'i-lucide-folder',
        to: parentPath,
      })
    }
  }

  for (const sibling of siblings) {
    items.push({
      label: sibling.title,
      to: sibling.path,
    })
  }

  return items.length > 1 ? items : null
}

export function buildConnectPageCategoryNavItemsWithAccordion(
  rawPages: any[],
  activePath?: string,
): NavigationMenuItem[] {
  const activeCategory = activePath ? resolveNavCategoryForPath(rawPages, activePath) : null
  const categories = buildConnectPageCategoryNavItems(rawPages)

  return categories.map((category) => {
    const categoryValue = CONNECT_PAGE_CATEGORIES.find((c) => c.label === category.label)?.value
    const categoryPath = categoryValue ? CONNECT_PAGE_CATEGORY_PATHS[categoryValue] : undefined
    const shouldOpen = activeCategory
      ? categoryValue === activeCategory
      : false
    const normalizedActivePath = activePath ? normalizeConnectPageLookupPath(activePath) : ''
    const isCategoryLandingActive = Boolean(
      categoryPath && normalizedActivePath === normalizeConnectPageLookupPath(categoryPath),
    )
    return withNavTooltips({
      ...category,
      defaultOpen: shouldOpen,
      active: isCategoryLandingActive,
    })
  })
}

/** Departments sidebar: contextual siblings on dept pages, accordion categories elsewhere. */
export function buildDepartmentsSidebarNavItems(rawPages: any[], path: string): NavigationMenuItem[] {
  const contextual = buildConnectPageContextualNavItems(rawPages, path)
  if (contextual?.length) {
    return contextual.map(withNavTooltips)
  }
  return buildConnectPageCategoryNavItemsWithAccordion(rawPages, path)
}

// Keep sortPages name for any external imports (alias).
export const sortPages = sortConnectPages

import type { NavigationMenuItem } from '@nuxt/ui'

export const CONNECT_PAGE_CATEGORIES = [
  { value: 'academic-affairs', label: 'Academic Affairs' },
  { value: 'advancement', label: 'Advancement' },
  { value: 'student-life-and-formation', label: 'Student Life and Formation' },
  { value: 'enrollment-management', label: 'Enrollment Management' },
  { value: 'finance-and-administration', label: 'Finance and Administration' },
] as const

export type ConnectPageCategory = typeof CONNECT_PAGE_CATEGORIES[number]['value']

export type ConnectPageNode = {
  id: number | string
  title?: string | null
  slug?: string | null
  content?: unknown
  navCategory?: string | null
  parent?: number | string | { id?: number | string } | null
  parentId: string | null
  order?: number | null
  updatedAt?: string
  createdAt?: string
}

type TreeNode = {
  page: ConnectPageNode
  children: TreeNode[]
}

const collator = new Intl.Collator('en', { sensitivity: 'base' })

export function normalizeParentId(parent: unknown): string | null {
  if (parent == null) return null
  if (typeof parent === 'object') {
    const id = (parent as { id?: number | string }).id
    if (id == null) return null
    return String(id)
  }
  return String(parent)
}

export function normalizeConnectPage(page: any): ConnectPageNode {
  const rawCategory = typeof page?.navCategory === 'string' ? page.navCategory.trim().toLowerCase() : ''
  const allowed = new Set<string>(CONNECT_PAGE_CATEGORIES.map((c) => c.value))
  return {
    ...page,
    navCategory: allowed.has(rawCategory) ? rawCategory : null,
    parentId: normalizeParentId(page?.parent),
  }
}

function sortPages(a: ConnectPageNode, b: ConnectPageNode) {
  const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER
  const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB
  return collator.compare((a.title || a.slug || '').toString(), (b.title || b.slug || '').toString())
}

export function buildPageTree(rawPages: any[]): TreeNode[] {
  const pages = rawPages.map(normalizeConnectPage)
  const nodesById = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const page of pages) {
    nodesById.set(String(page.id), { page, children: [] })
  }

  for (const page of pages) {
    const node = nodesById.get(String(page.id))
    if (!node) continue
    if (!page.parentId) {
      roots.push(node)
      continue
    }
    const parent = nodesById.get(page.parentId)
    if (!parent || page.parentId === String(page.id)) {
      roots.push(node)
      continue
    }
    parent.children.push(node)
  }

  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => sortPages(a.page, b.page))
    nodes.forEach((n) => sortTree(n.children))
    return nodes
  }

  return sortTree(roots)
}

export function buildPagePathMap(rawPages: any[]) {
  const pages = rawPages.map(normalizeConnectPage)
  const byId = new Map<string, ConnectPageNode>()
  for (const page of pages) byId.set(String(page.id), page)

  const cache = new Map<string, string | null>()
  const makePath = (page: ConnectPageNode, stack = new Set<string>()): string | null => {
    const pageId = String(page.id)
    if (cache.has(pageId)) return cache.get(pageId) ?? null

    const slug = (page.slug || '').toString().trim().replace(/^\/+|\/+$/g, '')
    if (!slug) {
      cache.set(pageId, null)
      return null
    }

    if (!page.parentId) {
      const out = `/${slug}`
      cache.set(pageId, out)
      return out
    }

    if (stack.has(pageId)) {
      cache.set(pageId, null)
      return null
    }

    const parent = byId.get(page.parentId)
    if (!parent) {
      const out = `/${slug}`
      cache.set(pageId, out)
      return out
    }

    stack.add(pageId)
    const parentPath = makePath(parent, stack)
    stack.delete(pageId)
    if (!parentPath) {
      const out = `/${slug}`
      cache.set(pageId, out)
      return out
    }
    const out = `${parentPath}/${slug}`
    cache.set(pageId, out)
    return out
  }

  const pathById = new Map<string, string>()
  for (const page of pages) {
    const path = makePath(page)
    if (path) pathById.set(String(page.id), path)
  }

  return { byId, pathById }
}

export function buildConnectPageNavItems(rawPages: any[]): NavigationMenuItem[] {
  const tree = buildPageTree(rawPages)
  const { pathById } = buildPagePathMap(rawPages)

  const toMenuItem = (node: TreeNode): NavigationMenuItem | null => {
    const id = String(node.page.id)
    const path = pathById.get(id)
    const label = (node.page.title || node.page.slug || '').toString().trim() || `#${id}`
    const children = node.children.map(toMenuItem).filter((i): i is NavigationMenuItem => i != null)
    if (!path && !children.length) return null
    const out: NavigationMenuItem = { label }
    if (path) out.to = path
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

  const toMenuItem = (node: TreeNode): NavigationMenuItem | null => {
    const id = String(node.page.id)
    const path = pathById.get(id)
    const label = (node.page.title || node.page.slug || '').toString().trim() || `#${id}`
    const children = node.children.map(toMenuItem).filter((i): i is NavigationMenuItem => i != null)
    if (!path && !children.length) return null
    const out: NavigationMenuItem = { label }
    if (path) out.to = path
    if (children.length) out.children = children
    return out
  }

  const grouped = new Map<ConnectPageCategory, NavigationMenuItem[]>()
  for (const c of CONNECT_PAGE_CATEGORIES) grouped.set(c.value, [])

  for (const rootNode of tree) {
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

export function findConnectPageByPath(rawPages: any[], path: string) {
  const normalizedPath = `/${path.replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/')
  const pages = rawPages.map(normalizeConnectPage)
  const { pathById } = buildPagePathMap(pages)
  const match = pages.find((p) => pathById.get(String(p.id)) === normalizedPath)
  return match || null
}

export function getConnectPageBreadcrumbLabel(rawPages: any[], pageId: string | number): string {
  const pages = rawPages.map(normalizeConnectPage)
  const byId = new Map<string, ConnectPageNode>()
  for (const page of pages) byId.set(String(page.id), page)

  const parts: string[] = []
  let current = byId.get(String(pageId)) || null
  const seen = new Set<string>()
  while (current) {
    const id = String(current.id)
    if (seen.has(id)) break
    seen.add(id)
    parts.unshift((current.title || current.slug || `#${id}`).toString())
    current = current.parentId ? (byId.get(current.parentId) || null) : null
  }
  return parts.join(' / ')
}

export const CONNECT_PAGE_CATEGORIES = [
  { value: 'academic-affairs', label: 'Academic Affairs' },
  { value: 'advancement', label: 'Advancement' },
  { value: 'student-life-and-formation', label: 'Student Life and Formation' },
  { value: 'enrollment-management', label: 'Enrollment Management' },
  { value: 'finance-and-administration', label: 'Finance and Administration' },
] as const

export type ConnectPageCategory = typeof CONNECT_PAGE_CATEGORIES[number]['value']

export const AUDIENCE_HUB_SLUGS = ['faculty', 'staff', 'students'] as const

export type AudienceHubSlug = (typeof AUDIENCE_HUB_SLUGS)[number]

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

const collator = new Intl.Collator('en', { sensitivity: 'base' })

export function normalizeConnectPageSlug(slug: unknown): string {
  return (slug ?? '').toString().trim().toLowerCase().replace(/^\/+|\/+$/g, '')
}

export function isAudienceHubRootPage(page: Pick<ConnectPageNode, 'slug' | 'parentId'>): boolean {
  if (page.parentId) return false
  const normalized = normalizeConnectPageSlug(page.slug)
  return (AUDIENCE_HUB_SLUGS as readonly string[]).includes(normalized)
}

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

export function sortConnectPages(a: ConnectPageNode, b: ConnectPageNode) {
  const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER
  const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB
  return collator.compare((a.title || a.slug || '').toString(), (b.title || b.slug || '').toString())
}

type TreeNode = {
  page: ConnectPageNode
  children: TreeNode[]
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
    nodes.sort((a, b) => sortConnectPages(a.page, b.page))
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

export function normalizeConnectPageLookupPath(path: string) {
  let p = typeof path === 'string' ? path.trim() : ''
  const qi = p.indexOf('?')
  if (qi >= 0) p = p.slice(0, qi)
  const hi = p.indexOf('#')
  if (hi >= 0) p = p.slice(0, hi)
  return `/${p.replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/')
}

export function findConnectPageByPath(rawPages: any[], path: string) {
  const normalizedPath = normalizeConnectPageLookupPath(path)
  const pages = rawPages.map(normalizeConnectPage)
  const { pathById } = buildPagePathMap(pages)
  const match = pages.find((p) => pathById.get(String(p.id)) === normalizedPath)
  return match || null
}

export function hasRenderableConnectPageContent(content: unknown): boolean {
  if (content == null) return false
  if (typeof content === 'string') return content.trim().length > 0
  if (typeof content !== 'object') return false
  const c = content as Record<string, unknown>
  if (typeof c.html === 'string') return c.html.trim().length > 0
  const root = c.root as Record<string, unknown> | undefined
  if (root && Array.isArray(root.children) && root.children.length > 0) return true
  return false
}

export function connectPageHasUsableDetail(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false
  const page = doc as ConnectPageNode & { contacts?: unknown; contactsHeading?: unknown }
  if (hasRenderableConnectPageContent(page.content)) return true
  if (Array.isArray(page.contacts) && page.contacts.length > 0) return true
  if (typeof page.contactsHeading === 'string' && page.contactsHeading.trim()) return true
  return false
}

export function getDirectChildConnectPages(
  rawPages: any[],
  parentId: string | number,
): Array<{ id: string; title: string; path: string }> {
  const docs = rawPages.map(normalizeConnectPage)
  const { pathById } = buildPagePathMap(docs)
  const currentId = String(parentId)
  return docs
    .filter((doc) => doc.parentId === currentId)
    .sort(sortConnectPages)
    .map((doc) => {
      const path = pathById.get(String(doc.id))
      if (!path) return null
      return {
        id: String(doc.id),
        title: (doc.title || doc.slug || `#${doc.id}`).toString(),
        path,
      }
    })
    .filter((doc): doc is { id: string; title: string; path: string } => doc != null)
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

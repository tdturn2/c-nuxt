export const CONNECT_PAGE_CATEGORIES = [
  { value: 'academic-affairs', label: 'Academic Affairs' },
  { value: 'advancement', label: 'Advancement' },
  { value: 'beeson-center', label: 'Beeson Center' },
  { value: 'enrollment-management', label: 'Enrollment Services' },
  { value: 'finance-and-administration', label: 'Finance and Administration' },
  { value: 'presidents-office', label: "President's Office" },
  { value: 'student-life-and-formation', label: 'Student Life and Formation' },
] as const

export type ConnectPageCategory = typeof CONNECT_PAGE_CATEGORIES[number]['value']

/** Canonical top-level paths for department category landing pages (breadcrumb roots). */
export const CONNECT_PAGE_CATEGORY_PATHS: Record<ConnectPageCategory, string> = {
  'academic-affairs': '/academic-affairs',
  'advancement': '/advancement',
  'beeson-center': '/beeson-center',
  'enrollment-management': '/emt',
  'finance-and-administration': '/finance-admin',
  'presidents-office': '/president',
  'student-life-and-formation': '/formation',
}

export const AUDIENCE_HUB_SLUGS = ['faculty', 'staff', 'students'] as const

export type AudienceHubSlug = (typeof AUDIENCE_HUB_SLUGS)[number]

export type ConnectPageNode = {
  id: number | string
  title?: string | null
  slug?: string | null
  content?: unknown
  layout?: string | null
  customHtml?: string | null
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
  if (String(page.layout || '').toLowerCase() === 'html' && String(page.customHtml || '').trim()) return true
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

export type ConnectPageNavLink = {
  id: string
  title: string
  path: string
}

export type ConnectPageBreadcrumbItem = {
  label: string
  to?: string
}

export function getConnectPageAncestors(
  rawPages: any[],
  pageId: string | number,
): ConnectPageNavLink[] {
  const pages = rawPages.map(normalizeConnectPage)
  const byId = new Map(pages.map((p) => [String(p.id), p]))
  const { pathById } = buildPagePathMap(pages)
  const current = byId.get(String(pageId))
  if (!current?.parentId) return []

  const ancestors: ConnectPageNavLink[] = []
  let parentId: string | null = current.parentId
  const seen = new Set<string>()

  while (parentId) {
    if (seen.has(parentId)) break
    seen.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    const path = pathById.get(parentId)
    if (path) {
      ancestors.unshift({
        id: parentId,
        title: (parent.title || parent.slug || `#${parentId}`).toString(),
        path,
      })
    }
    parentId = parent.parentId
  }

  return ancestors
}

export function resolveEffectiveConnectPageCategory(
  rawPages: any[],
  pageId: string | number,
): ConnectPageCategory | null {
  const pages = rawPages.map(normalizeConnectPage)
  const byId = new Map(pages.map((p) => [String(p.id), p]))
  const allowed = new Set<string>(CONNECT_PAGE_CATEGORIES.map((c) => c.value))

  let current: ConnectPageNode | undefined = byId.get(String(pageId))
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

export function resolveCategoryRootPage(
  rawPages: any[],
  pageId: string | number,
): ConnectPageNavLink | null {
  const category = resolveEffectiveConnectPageCategory(rawPages, pageId)
  if (!category) return null

  const path = CONNECT_PAGE_CATEGORY_PATHS[category]
  const meta = CONNECT_PAGE_CATEGORIES.find((c) => c.value === category)
  const pageAtPath = findConnectPageByPath(rawPages, path)

  return {
    id: pageAtPath ? String(pageAtPath.id) : `category:${category}`,
    title: (pageAtPath?.title || meta?.label || category).toString(),
    path,
  }
}

export function getConnectPageSiblings(
  rawPages: any[],
  pageId: string | number,
): ConnectPageNavLink[] {
  const pages = rawPages.map(normalizeConnectPage)
  const current = pages.find((p) => String(p.id) === String(pageId))
  if (!current?.parentId) return []
  return getDirectChildConnectPages(rawPages, current.parentId)
}

export function buildConnectPageBreadcrumbs(
  rawPages: any[],
  path: string,
): ConnectPageBreadcrumbItem[] {
  const page = findConnectPageByPath(rawPages, path)
  if (!page || isAudienceHubRootPage(page)) return []

  const pages = rawPages.map(normalizeConnectPage)
  const byId = new Map(pages.map((p) => [String(p.id), p]))
  const current = byId.get(String(page.id))
  if (!current) return []

  const crumbs: ConnectPageBreadcrumbItem[] = []
  const ancestors = getConnectPageAncestors(rawPages, current.id)
  const categoryRoot = resolveCategoryRootPage(rawPages, current.id)
  const normalizedPath = normalizeConnectPageLookupPath(path)

  if (categoryRoot) {
    const categoryPath = normalizeConnectPageLookupPath(categoryRoot.path)
    const onCategoryRoot = normalizedPath === categoryPath
    if (!onCategoryRoot) {
      crumbs.push({ label: categoryRoot.title, to: categoryRoot.path })
    }
  }

  for (const ancestor of ancestors) {
    if (categoryRoot) {
      const categoryPath = normalizeConnectPageLookupPath(categoryRoot.path)
      const ancestorPath = normalizeConnectPageLookupPath(ancestor.path)
      if (ancestorPath === categoryPath || ancestor.id === categoryRoot.id) continue
    }
    crumbs.push({ label: ancestor.title, to: ancestor.path })
  }

  const currentLabel = (current.title || current.slug || '').toString().trim()
  if (currentLabel) crumbs.push({ label: currentLabel })

  return crumbs
}

/**
 * Keep this file in sync with Sites/connect-api/src/lib/pageEditorGroups.ts
 *
 * Map Connect group slugs to page path prefixes they may edit (including children).
 * Example: group `arp` can update /arp and /arp/...
 *
 * Assign members on /dashboard/users (Connect groups, not Azure/SSO).
 */
export const PAGE_EDITOR_GROUPS: Record<string, string[]> = {
  arp: ['/arp'],
  hr: ['/hr'],
  registrar: ['/registrar'],
}

export function normalizeEditorPath(path: string): string {
  let p = typeof path === 'string' ? path.trim() : ''
  if (!p) return '/'
  const qi = p.indexOf('?')
  if (qi >= 0) p = p.slice(0, qi)
  const hi = p.indexOf('#')
  if (hi >= 0) p = p.slice(0, hi)
  p = p.replace(/\/+/g, '/').toLowerCase()
  if (!p.startsWith('/')) p = `/${p}`
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p || '/'
}

export function joinConnectPageSlugs(slugs: string[]): string {
  const parts = slugs
    .map((s) => String(s || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase())
    .filter(Boolean)
  if (!parts.length) return '/'
  return `/${parts.join('/')}`
}

export function childPagePath(parentPath: string | null | undefined, slug: string): string {
  const child = String(slug || '').trim().replace(/^\/+|\/+$/g, '').toLowerCase()
  if (!child) return normalizeEditorPath(parentPath || '/')
  if (!parentPath || parentPath === '/') return joinConnectPageSlugs([child])
  return joinConnectPageSlugs([
    ...normalizeEditorPath(parentPath).split('/').filter(Boolean),
    child,
  ])
}

export function pathMatchesEditorPrefixes(pagePath: string, prefixes: string[]): boolean {
  const path = normalizeEditorPath(pagePath)
  return prefixes.some((raw) => {
    const prefix = normalizeEditorPath(raw)
    if (prefix === '/') return path === '/'
    return path === prefix || path.startsWith(`${prefix}/`)
  })
}

export function groupSlugsFromUserGroups(groups: unknown): string[] {
  if (!Array.isArray(groups)) return []
  return groups
    .map((group) => {
      if (group && typeof group === 'object' && 'slug' in group) {
        return String((group as { slug?: string | null }).slug || '').trim().toLowerCase()
      }
      return ''
    })
    .filter(Boolean)
}

export function editorPrefixesForGroups(groupSlugs: string[]): string[] {
  const prefixes: string[] = []
  for (const slug of groupSlugs) {
    const key = String(slug || '').trim().toLowerCase()
    const mapped = PAGE_EDITOR_GROUPS[key]
    if (!mapped?.length) continue
    prefixes.push(...mapped)
  }
  return prefixes
}

export function canEditPageByGroups(opts: {
  isAdmin: boolean
  groupSlugs: string[]
  pagePath: string
}): boolean {
  if (opts.isAdmin) return true
  const prefixes = editorPrefixesForGroups(opts.groupSlugs)
  if (!prefixes.length) return false
  return pathMatchesEditorPrefixes(opts.pagePath, prefixes)
}

/** Elsevier Digital Commons Outbound API v2 — shared client bits for server routes. */

export const OUTBOUND_DC_BASE = 'https://content-out.bepress.com/v2'

export function resolveDigitalCommonsSiteHost(configHost: unknown): string {
  const fromConfig = String(configHost || '').trim()
  const fromEnv = String(
    process.env.NUXT_DIGITAL_COMMONS_SITE_HOST || process.env.DIGITAL_COMMONS_SITE_URL || '',
  ).trim()
  const raw = fromConfig || fromEnv || 'place.asburyseminary.edu'
  return raw
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
}

export function resolveDigitalCommonsApiToken(configToken: unknown): string {
  const fromConfig = String(configToken || '').trim()
  const fromEnv = String(
    process.env.NUXT_DIGITAL_COMMONS_API_TOKEN ||
      process.env.DIGITAL_COMMONS_API_TOKEN ||
      process.env.BEPRESS_API_TOKEN ||
      '',
  ).trim()
  return fromConfig || fromEnv
}

export function extractDcOutboundDocs(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return []
  const p = payload as Record<string, unknown>
  if (Array.isArray(p.results)) return p.results as Record<string, unknown>[]
  if (Array.isArray(p.docs)) return p.docs as Record<string, unknown>[]
  const response = p.response
  if (response && typeof response === 'object') {
    const docs = (response as Record<string, unknown>).docs
    if (Array.isArray(docs)) return docs as Record<string, unknown>[]
  }
  const data = p.data
  if (data && typeof data === 'object') {
    const inner = data as Record<string, unknown>
    if (Array.isArray(inner.results)) return inner.results as Record<string, unknown>[]
  }
  return []
}

/** BePress expects `http://` parent_link URLs (see Outbound API docs / Go SDK). */
export function repositoryUrlToHttpParentLink(absoluteUrl: string): string {
  const u = new URL(absoluteUrl)
  const path = u.pathname.replace(/\/$/, '') || '/'
  return `http://${u.hostname}${path}`
}

/** Solr / outbound fields that often carry a PDF or full-text URL (order: prefer explicit downloads first). */
const DC_PDF_FIELD_KEYS = [
  'download_link',
  'pdf_url',
  'fulltext_url',
  'download_url',
  'file_url',
  'fulltext_link',
  'bepress_download_url',
  'primary_document_url',
  'multimedia_url',
  'presentation_pdf_url',
  'document_url',
] as const

function coerceDocLinkish(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = coerceDocLinkish(item)
      if (s) return s
    }
    return null
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    for (const k of ['url', 'href', 'link']) {
      const v = o[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return null
}

/** Best-effort PDF / full-text href from an Outbound API v2 document. */
export function pickDcPdfHref(doc: Record<string, unknown>): string | null {
  for (const key of DC_PDF_FIELD_KEYS) {
    const s = coerceDocLinkish(doc[key])
    if (s) return s
  }
  return null
}

/** Turn repository-relative or protocol-relative hrefs into an absolute https URL for `siteHost`. */
export function resolveRepositoryHrefToAbsolute(href: string, siteHost: string): string {
  const host = siteHost.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
  const base = `https://${host}/`
  const t = href.trim()
  try {
    if (/^https?:\/\//i.test(t)) return new URL(t).toString()
    if (t.startsWith('//')) return new URL(`https:${t}`).toString()
    return new URL(t, base).toString()
  } catch {
    return t
  }
}

/**
 * When Outbound exposes `viewcontent.cgi` without `path_info`, add it from Solr
 * hints so canonicalization can build a valid download URL.
 */
export function applyDcViewcontentPathInfoHint(href: string, doc: Record<string, unknown>): string {
  try {
    const u = new URL(href.trim())
    if (!u.hostname.endsWith('place.asburyseminary.edu')) return href
    if (u.pathname.toLowerCase() !== '/cgi/viewcontent.cgi') return href
    if (u.searchParams.get('path_info')) return href

    for (const key of [
      'path_info',
      'filename',
      'file_name',
      'document_filename',
      'primary_attachment_filename',
      'download_file_name',
    ] as const) {
      const hint = coerceDocLinkish(doc[key])
      if (!hint || hint.length > 512 || hint.includes('?')) continue
      const leaf = hint.includes('/') ? (hint.split('/').pop() || hint) : hint
      if (leaf) {
        u.searchParams.set('path_info', leaf)
        return u.toString()
      }
    }
    return href
  } catch {
    return href
  }
}

export async function fetchDcOutboundParentLink(options: {
  siteHost: string
  token: string
  parentLink: string
  limit: number
}): Promise<Record<string, unknown>[]> {
  const lim = Math.min(1000, Math.max(1, options.limit))
  const params = new URLSearchParams({
    parent_link: options.parentLink,
    limit: String(lim),
    // Default query responses omit many Solr fields; PDF URLs often live in
    // download_link / fulltext_url etc. See Outbound API `select_fields=all`.
    select_fields: 'all',
  })
  const pathSite = options.siteHost.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
  const url = `${OUTBOUND_DC_BASE}/${encodeURIComponent(pathSite)}/query?${params.toString()}`

  const payload = await $fetch<unknown>(url, {
    timeout: 30000,
    headers: {
      Accept: 'application/json',
      Authorization: options.token.trim(),
      'User-Agent': 'AsburyConnect-DigitalCommons/1.0',
    },
  })

  return extractDcOutboundDocs(payload)
}

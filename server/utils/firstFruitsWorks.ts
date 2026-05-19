import { createError } from 'h3'
import { normalizePlaceViewcontentSearchUrl } from '@shared/digitalCommonsViewcontent'
import {
  applyDcViewcontentPathInfoHint,
  pickDcPdfHref,
  resolveRepositoryHrefToAbsolute,
} from './digitalCommonsOutbound'

export type FirstFruitsWork = {
  id: string
  title: string
  creators: string[]
  date: string | null
  year: string | null
  source: string | null
  url: string | null
  fileUrl: string | null
  thumbnailUrl: string | null
  description: string | null
  shelf: 'books' | 'other'
}

export const FIRST_FRUITS_BOOKS_PARENT_LINK = 'http://place.asburyseminary.edu/firstfruitsbooks'

export const FIRST_FRUITS_OTHER_PARENT_LINKS = [
  'http://place.asburyseminary.edu/firstfruitsjournals',
  'http://place.asburyseminary.edu/firstfruitspapers',
  'http://place.asburyseminary.edu/firstfruitsrussian',
  'http://place.asburyseminary.edu/firstfruitsspanish',
] as const

function pickFirstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) return item.trim()
    }
  }
  return null
}

function pickStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

function pickTitle(doc: Record<string, unknown>): string | null {
  const candidates = [
    doc.title,
    doc.publication_title,
    doc['dc.title'],
    doc.document_title,
    doc['document-title'],
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
    if (typeof c === 'number' && Number.isFinite(c)) return String(c)
    if (Array.isArray(c)) {
      for (const item of c) {
        if (typeof item === 'string' && item.trim()) return item.trim()
      }
    }
  }
  return null
}

export function inferShelf(doc: Record<string, unknown>, publication: string | null): 'books' | 'other' {
  const blob = [
    publication,
    pickFirstString(doc.publication),
    pickFirstString(doc.series),
    pickFirstString(doc.parent_link),
    pickFirstString(doc.publication_link),
    pickFirstString(doc.url),
    pickFirstString(doc.article_url),
    pickFirstString(doc.record_url),
    pickFirstString(doc.context),
    pickFirstString(doc.context_key),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/firstfruitsbooks|first.?fruits.?books|\/firstfruitsbooks(\/|$)/i.test(blob)) return 'books'
  if (/\bbooks\b/i.test(blob) && /first.?fruit/i.test(blob)) return 'books'
  return 'other'
}

/** Gallery thumbs on place.asburyseminary.edu/firstfruitsbooks use article id, not record path id. */
export function pickFirstFruitsBooksThumbnail(
  doc: Record<string, unknown>,
  siteHost: string,
): string | null {
  const fromApi =
    pickFirstString(doc.thumbnail_url) ||
    pickFirstString(doc.cover_url) ||
    pickFirstString(doc.image_url)
  if (fromApi) return resolveRepositoryHrefToAbsolute(fromApi, siteHost)

  const downloadish =
    pickDcPdfHref(doc) ||
    pickFirstString(doc.fulltext_url) ||
    pickFirstString(doc.download_link)
  if (!downloadish) return null

  const articleMatch = downloadish.match(/[?&]article=(\d+)/i)
  if (!articleMatch?.[1]) return null

  let context = 'firstfruitsbooks'
  const contextMatch = downloadish.match(/[?&]context=([^&]+)/i)
  if (contextMatch?.[1]) context = contextMatch[1].replace(/^\//, '')

  const host = siteHost.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
  return `https://${host}/${context}/${articleMatch[1]}/thumbnail.jpg`
}

export function normalizeOutboundDoc(doc: Record<string, unknown>, siteHost: string): FirstFruitsWork | null {
  const title = pickTitle(doc)
  if (!title) return null

  const creators = Array.from(
    new Set([
      ...pickStringArray(doc.authors),
      ...pickStringArray(doc.author),
      ...pickStringArray(doc.author_display),
      ...pickStringArray(doc['dc.creator']),
    ]),
  )

  const dateCandidate =
    pickFirstString(doc.publication_date) ||
    pickFirstString(doc.date) ||
    pickFirstString(doc['dc.date'])

  const date =
    dateCandidate && !Number.isNaN(Date.parse(dateCandidate))
      ? new Date(dateCandidate).toISOString()
      : null
  const year = date ? String(new Date(date).getUTCFullYear()) : null

  const rawPdfHref = pickDcPdfHref(doc)
  const fileUrl = rawPdfHref
    ? normalizePlaceViewcontentSearchUrl(
        applyDcViewcontentPathInfoHint(resolveRepositoryHrefToAbsolute(rawPdfHref, siteHost), doc),
      )
    : null

  const url =
    pickFirstString(doc.url) ||
    pickFirstString(doc.record_url) ||
    pickFirstString(doc.article_url) ||
    fileUrl ||
    null

  const source =
    pickFirstString(doc.publication) ||
    pickFirstString(doc.publication_title) ||
    pickFirstString(doc.series) ||
    pickFirstString(doc['dc.source']) ||
    pickFirstString(doc.document_type) ||
    null

  const shelf = inferShelf(doc, source)

  const thumbnailUrl =
    shelf === 'books'
      ? pickFirstFruitsBooksThumbnail(doc, siteHost)
      : pickFirstString(doc.thumbnail_url) ||
        pickFirstString(doc.cover_url) ||
        pickFirstString(doc.image_url) ||
        null

  const id =
    pickFirstString(doc.id) ||
    pickFirstString(doc.identifier) ||
    pickFirstString(doc['dc.identifier']) ||
    pickFirstString(doc.context_key) ||
    (url || fileUrl || `${title}-${Math.random().toString(36).slice(2)}`)

  return {
    id,
    title,
    creators,
    date,
    year,
    source,
    url: url ? resolveRepositoryHrefToAbsolute(url, siteHost).replace(/^http:/i, 'https:') : null,
    fileUrl,
    thumbnailUrl,
    description: pickFirstString(doc.abstract) || pickFirstString(doc.description) || null,
    shelf,
  }
}

export function dedupeFirstFruitsWorks(items: FirstFruitsWork[]): FirstFruitsWork[] {
  const unique = new Map<string, FirstFruitsWork>()
  for (const item of items) {
    const key = item.id || item.url || item.fileUrl
    if (!key) continue
    if (!unique.has(key)) unique.set(key, item)
  }
  return Array.from(unique.values())
}

export function specToParentLink(spec: string, siteHost: string): string {
  const s = spec.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) {
    return s.replace(/^https:/i, 'http:')
  }
  const slug = (s.includes(':') ? s.slice(s.indexOf(':') + 1) : s).replace(/^\//, '').replace(/\/$/, '')
  return `http://${siteHost}/${slug}`
}

export function upstreamHttpStatus(err: unknown): number | undefined {
  const e = err as Record<string, unknown>
  if (typeof e.statusCode === 'number') return e.statusCode
  if (typeof e.status === 'number') return e.status
  const res = e.response as Record<string, unknown> | undefined
  if (res && typeof res.status === 'number') return res.status
  return undefined
}

export function digitalCommonsFetchError(error: unknown) {
  const err = error as { statusMessage?: string; message?: string; data?: { message?: string } }
  const upstream = upstreamHttpStatus(error)
  const status =
    upstream === 401 || upstream === 403
      ? upstream
      : upstream && upstream >= 400 && upstream < 500
        ? upstream
        : 502
  const upstreamMsg =
    (typeof err.data?.message === 'string' && err.data.message) ||
    err?.statusMessage ||
    err?.message ||
    ''
  return createError({
    statusCode: status,
    statusMessage:
      upstreamMsg ||
      (status === 401 || status === 403
        ? 'Digital Commons API rejected the security token.'
        : 'Failed to fetch First Fruits records from the Digital Commons API.'),
  })
}

import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { normalizePlaceViewcontentSearchUrl } from '@shared/digitalCommonsViewcontent'
import {
  applyDcViewcontentPathInfoHint,
  fetchDcOutboundParentLink,
  pickDcPdfHref,
  repositoryUrlToHttpParentLink,
  resolveDigitalCommonsApiToken,
  resolveDigitalCommonsSiteHost,
  resolveRepositoryHrefToAbsolute,
} from '../../utils/digitalCommonsOutbound'

type Query = {
  issueUrl?: string
}

type Entry = {
  title: string
  author: string | null
  articleUrl: string | null
  pdfUrl: string | null
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function toAbsolute(base: string, url: string): string {
  try {
    return new URL(url, base).toString()
  } catch {
    return url
  }
}

function toHttpsRepositoryUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol === 'http:') u.protocol = 'https:'
    return u.toString()
  } catch {
    return url
  }
}

function parseIssueTitle(html: string): string | null {
  const m = html.match(/<h1[^>]*>\s*Volume\s+([\s\S]*?)<\/h1>/i)
  if (!m?.[1]) return null
  return decode(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
}

function parseCoverUrl(html: string, issueUrl: string): string | null {
  const m = html.match(/<div id="issue-art">[\s\S]*?<img[^>]*src="([^"]+)"/i)
  if (!m?.[1]) return null
  return toAbsolute(issueUrl, decode(m[1]))
}

function parseEntries(html: string, issueUrl: string): Entry[] {
  const entries: Entry[] = []
  const re = /<div class="doc">[\s\S]*?<p class="pdf">[\s\S]*?<a href="([^"]+)"[^>]*>PDF<\/a>[\s\S]*?<\/p>[\s\S]*?<p>\s*<a href="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>\s*<br>\s*<span class="auth">\s*([\s\S]*?)\s*<\/span>\s*<\/p>[\s\S]*?<\/div>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const pdf = m[1] ? toAbsolute(issueUrl, decode(m[1])) : null
    const article = m[2] ? toAbsolute(issueUrl, decode(m[2])) : null
    const title = decode((m[3] || '').replace(/<[^>]+>/g, ' '))
    const author = decode((m[4] || '').replace(/<[^>]+>/g, ' ')) || null
    if (!title) continue
    entries.push({ title, author, articleUrl: article, pdfUrl: pdf })
  }
  return entries
}

function pickFirstAuthor(doc: Record<string, unknown>): string | null {
  const a = doc.author
  if (Array.isArray(a)) {
    const s = a.find((x) => typeof x === 'string' && x.trim())
    return typeof s === 'string' ? s.trim() : null
  }
  if (typeof a === 'string' && a.trim()) return a.trim()
  return null
}

function mapOutboundDocToEntry(doc: Record<string, unknown>, siteHost: string): Entry | null {
  const title = typeof doc.title === 'string' && doc.title.trim() ? doc.title.trim() : null
  if (!title) return null
  const rawArticle = typeof doc.url === 'string' && doc.url.trim() ? doc.url.trim() : null
  const articleUrl = rawArticle ? toHttpsRepositoryUrl(resolveRepositoryHrefToAbsolute(rawArticle, siteHost)) : null
  const rawPdf = pickDcPdfHref(doc)
  const pdfUrl = rawPdf
    ? normalizePlaceViewcontentSearchUrl(
        applyDcViewcontentPathInfoHint(
          toHttpsRepositoryUrl(resolveRepositoryHrefToAbsolute(rawPdf, siteHost)),
          doc,
        ),
      )
    : null
  return {
    title,
    author: pickFirstAuthor(doc),
    articleUrl,
    pdfUrl,
  }
}

function articleOrdinal(url: string | null): number {
  if (!url) return 1e9
  const m = url.match(/\/(\d+)$/)
  return m ? Number.parseInt(m[1], 10) : 1e9
}

function inferIssueTitleFromIssueUrl(issueUrl: string): string | null {
  const m = issueUrl.match(/\/vol(\d+)\/iss(\d+)/i)
  if (!m) return null
  return `${m[1]}, Issue ${m[2]}`
}

async function fetchEntriesFromOutboundApi(
  h3Event: H3Event,
  issueUrl: string,
): Promise<{ entries: Entry[]; source: string } | null> {
  const config = useRuntimeConfig(h3Event)
  const token = resolveDigitalCommonsApiToken(config.digitalCommonsApiToken)
  if (!token) return null

  const siteHost = resolveDigitalCommonsSiteHost(config.digitalCommonsSiteHost)
  const parentLink = repositoryUrlToHttpParentLink(issueUrl)

  const docs = await fetchDcOutboundParentLink({
    siteHost,
    token,
    parentLink,
    limit: 100,
  })

  const entries = docs
    .map((doc) => mapOutboundDocToEntry(doc, siteHost))
    .filter((e): e is Entry => Boolean(e))
    .sort((a, b) => articleOrdinal(a.articleUrl) - articleOrdinal(b.articleUrl))

  if (entries.length === 0) return null
  return { entries, source: 'digital-commons-api-v2' }
}

async function fetchIssueMetaFromHtml(issueUrl: string): Promise<{ issueTitle: string | null; coverUrl: string | null }> {
  const html = await $fetch<string>(issueUrl, {
    timeout: 20000,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'AsburyConnect-DigitalCommons/1.0',
    },
  })
  return {
    issueTitle: parseIssueTitle(html),
    coverUrl: parseCoverUrl(html, issueUrl),
  }
}

export default defineCachedEventHandler(async (event) => {
  const q = getQuery(event) as Query
  const raw = String(q.issueUrl || '').trim()
  if (!raw) throw createError({ statusCode: 400, statusMessage: 'issueUrl is required' })

  let issueUrl = ''
  try {
    const u = new URL(raw)
    if (!u.hostname.endsWith('place.asburyseminary.edu')) {
      throw createError({ statusCode: 400, statusMessage: 'issueUrl must be on place.asburyseminary.edu' })
    }
    if (!/^\/(asburyjournal|faithandphilosophy)\/vol\d+\/iss\d+\/?$/i.test(u.pathname)) {
      throw createError({ statusCode: 400, statusMessage: 'issueUrl must be a journal issue path' })
    }
    issueUrl = u.toString().replace(/\/$/, '')
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({ statusCode: 400, statusMessage: 'Invalid issueUrl' })
  }

  try {
    const fromApi = await fetchEntriesFromOutboundApi(event, issueUrl).catch(() => null)
    if (fromApi) {
      let issueTitle: string | null = null
      let coverUrl: string | null = null
      try {
        const meta = await fetchIssueMetaFromHtml(issueUrl)
        issueTitle = meta.issueTitle
        coverUrl = meta.coverUrl
      } catch {
        // optional: issue list already has a label
      }
      if (!issueTitle) issueTitle = inferIssueTitleFromIssueUrl(issueUrl)

      return {
        issueUrl,
        issueTitle,
        coverUrl,
        entries: fromApi.entries,
        source: fromApi.source,
        fetchedAt: new Date().toISOString(),
      }
    }

    const html = await $fetch<string>(issueUrl, {
      timeout: 20000,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AsburyConnect-DigitalCommons/1.0',
      },
    })

    return {
      issueUrl,
      issueTitle: parseIssueTitle(html),
      coverUrl: parseCoverUrl(html, issueUrl),
      entries: parseEntries(html, issueUrl),
      source: 'digital-commons-html',
      fetchedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to fetch issue entries',
    })
  }
}, {
  maxAge: 60 * 60,
  name: 'digital-commons-issue-entries',
  getKey: (event) => {
    const q = getQuery(event) as Query
    return `v5:${String(q.issueUrl || '').trim()}`
  },
})

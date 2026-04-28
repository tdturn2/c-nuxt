import { createError, getQuery } from 'h3'

type CurrentEntry = {
  title: string
  author: string | null
  articleUrl: string | null
  pdfUrl: string | null
  year: string | null
}

type Query = {
  context?: string
  limit?: string
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

function parseYear(html: string): string | null {
  const m = html.match(/Current Issue:[^\n<]*\((\d{4})\)/i)
  return m?.[1] ?? null
}

function parseEntries(html: string, baseUrl: string): CurrentEntry[] {
  const entries: CurrentEntry[] = []
  // Parse the current issue article blocks under div.doc, tolerant of whitespace/comments.
  const blockRe = /<div class="doc">[\s\S]*?<p class="pdf">[\s\S]*?<a href="([^"]+)"[^>]*>PDF<\/a>[\s\S]*?<\/p>[\s\S]*?<p>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<br>\s*<span class="auth">([\s\S]*?)<\/span>\s*<\/p>[\s\S]*?<\/div>/gi

  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null) {
    const pdfUrl = m[1] ? toAbsolute(baseUrl, decode(m[1])) : null
    const articleUrl = m[2] ? toAbsolute(baseUrl, decode(m[2])) : null
    const title = decode((m[3] || '').replace(/<[^>]+>/g, ' '))
    const authorRaw = decode((m[4] || '').replace(/<[^>]+>/g, ' '))
    if (!title) continue

    entries.push({
      title,
      author: authorRaw || null,
      articleUrl,
      pdfUrl,
      year: null,
    })
  }

  return entries
}

export default defineCachedEventHandler(async (event) => {
  const q = getQuery(event) as Query
  const context = String(q.context || '').trim().toLowerCase()
  const limitRaw = Number.parseInt(String(q.limit || '24'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(60, Math.max(1, limitRaw)) : 24

  if (!context) {
    throw createError({ statusCode: 400, statusMessage: 'context is required' })
  }

  const url = `https://place.asburyseminary.edu/${context}/`

  try {
    const html = await $fetch<string>(url, {
      timeout: 20000,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AsburyConnect-DigitalCommons/1.0',
      },
    })

    const year = parseYear(html)
    const entries = parseEntries(html, url)
      .slice(0, limit)
      .map((e) => ({ ...e, year }))

    return {
      context,
      source: 'digital-commons-html',
      fetchedAt: new Date().toISOString(),
      total: entries.length,
      entries,
    }
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to fetch current issue entries',
    })
  }
}, {
  maxAge: 60 * 30,
  name: 'digital-commons-current-issue',
  getKey: (event) => {
    const q = getQuery(event) as Query
    return `v2:${String(q.context || '').toLowerCase()}:${String(q.limit || '24')}`
  },
})

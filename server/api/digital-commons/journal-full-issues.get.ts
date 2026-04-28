import { createError, getQuery } from 'h3'

type JournalIssue = {
  issueTitle: string
  issueUrl: string
  pdfUrl: string | null
  coverUrl: string | null
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

function normalizeHtml(raw: string): string {
  const start = raw.indexOf('<!DOCTYPE')
  return start >= 0 ? raw.slice(start) : raw
}

function toAbsolute(base: string, url: string): string {
  try {
    return new URL(url, base).toString()
  } catch {
    return url
  }
}

function parseIssueOptions(html: string, context: string): string[] {
  const escaped = context.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<option\\s+value="(https://place\\.asburyseminary\\.edu/${escaped}/vol\\d+/iss\\d+)"`, 'gi')
  const urls: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const u = decode(m[1] ?? '')
    if (u && !urls.includes(u)) urls.push(u)
  }
  return urls
}

function parseIssueTitle(html: string): string | null {
  const m = html.match(/<h1[^>]*>\s*Volume\s+([\s\S]*?)<\/h1>/i)
  if (!m) return null
  return decode((m[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
}

function parseFullIssuePdf(html: string): string | null {
  const m = html.match(/<p class="pdf"><a href="([^"]+)"[^>]*title="Download PDF of Journal in Entirety/i)
  return m?.[1] ? decode(m[1]) : null
}

function parseCoverUrl(html: string, issueUrl: string): string | null {
  const m = html.match(/<div id="issue-art">[\s\S]*?<img[^>]*src="([^"]+)"/i)
  if (!m?.[1]) return null
  return toAbsolute(issueUrl, decode(m[1]))
}

function parseYear(label: string | null): string | null {
  if (!label) return null
  const m = label.match(/\((\d{4})\)/)
  return m?.[1] ?? null
}

async function fetchIssue(issueUrl: string): Promise<JournalIssue | null> {
  const raw = await $fetch<string>(issueUrl, {
    timeout: 20000,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'AsburyConnect-DigitalCommons/1.0',
    },
  })
  const html = normalizeHtml(raw)
  const issueTitle = parseIssueTitle(html)
  if (!issueTitle) return null

  return {
    issueTitle,
    issueUrl,
    pdfUrl: parseFullIssuePdf(html),
    coverUrl: parseCoverUrl(html, issueUrl),
    year: parseYear(issueTitle),
  }
}

export default defineCachedEventHandler(async (event) => {
  const q = getQuery(event) as Query
  const context = String(q.context || '').trim().toLowerCase()
  const limitRaw = Number.parseInt(String(q.limit || '8'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(12, Math.max(1, limitRaw)) : 8

  if (!context) {
    throw createError({ statusCode: 400, statusMessage: 'context is required' })
  }

  const baseUrl = `https://place.asburyseminary.edu/${context}/`

  try {
    const baseRaw = await $fetch<string>(baseUrl, {
      timeout: 20000,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AsburyConnect-DigitalCommons/1.0',
      },
    })
    const baseHtml = normalizeHtml(baseRaw)

    let issueUrls = parseIssueOptions(baseHtml, context)
    if (issueUrls.length === 0) {
      const m = baseHtml.match(new RegExp(`https://place\\.asburyseminary\\.edu/${context}/vol\\d+/iss\\d+`, 'i'))
      if (m?.[0]) issueUrls = [decode(m[0])]
    }

    const sliced = issueUrls.slice(0, limit)
    const issues = (await Promise.all(sliced.map((u) => fetchIssue(u)))).filter(Boolean) as JournalIssue[]

    return {
      context,
      source: 'digital-commons-html',
      fetchedAt: new Date().toISOString(),
      total: issues.length,
      issues,
    }
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to fetch journal issues',
    })
  }
}, {
  maxAge: 60 * 60,
  name: 'digital-commons-journal-issues',
  getKey: (event) => {
    const q = getQuery(event) as Query
    return `v2:${String(q.context || '').toLowerCase()}:${String(q.limit || '8')}`
  },
})

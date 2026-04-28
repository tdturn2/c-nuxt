import { createError, getQuery } from 'h3'

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
    return `v1:${String(q.issueUrl || '').trim()}`
  },
})

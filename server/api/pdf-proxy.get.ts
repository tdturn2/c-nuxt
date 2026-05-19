import { createError, defineEventHandler, getQuery, setHeader } from 'h3'
import { normalizePlaceViewcontentSearchUrl } from '@shared/digitalCommonsViewcontent'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const raw = typeof q.url === 'string' ? q.url.trim() : ''
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'url is required' })
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid url' })
  }

  if (!(url.protocol === 'http:' || url.protocol === 'https:')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid protocol' })
  }

  // Keep this tight — only proxy Digital Commons PDFs we expect.
  if (!url.hostname.endsWith('place.asburyseminary.edu')) {
    throw createError({ statusCode: 400, statusMessage: 'Host not allowed' })
  }

  url = new URL(normalizePlaceViewcontentSearchUrl(url.toString()))

  // Some upstream links provide a double-encoded params query value.
  // Normalize once so upstream receives the expected /context/... value.
  if (url.pathname.toLowerCase() === '/cgi/viewcontent.cgi') {
    const rawParams = url.searchParams.get('params')
    if (rawParams) {
      try {
        const decodedOnce = decodeURIComponent(rawParams)
        if (decodedOnce.startsWith('/')) {
          const [normalizedParams, embeddedPathInfo] = decodedOnce.split('&path_info=')
          url.searchParams.set('params', normalizedParams)
          if (embeddedPathInfo && !url.searchParams.get('path_info')) {
            url.searchParams.set('path_info', embeddedPathInfo)
          }
        }
      } catch {
        // Leave original params value when decode fails.
      }
    }
  }

  try {
    const refererBase = `${url.protocol}//${url.host}/`
    const fallbackReferer = `${refererBase}${url.pathname.split('/').filter(Boolean)[0] || ''}/`

    const res = await $fetch.raw<ArrayBuffer>(url.toString(), {
      method: 'GET',
      responseType: 'arrayBuffer',
      headers: {
        // Some Digital Commons hosts block requests without a plausible referrer.
        // Use same-origin referrer to mirror normal browser navigation.
        Referer: fallbackReferer,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0',
        Accept: 'application/pdf,application/octet-stream,text/html;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    const contentType = res.headers.get('content-type') || 'application/pdf'
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Cache-Control', 'public, max-age=3600')

    // Framing / isolation: defaults from the stack or platform can attach
    // X-Frame-Options / CORP in ways that break an <iframe src="/api/pdf-proxy">.
    // Client-side we prefer fetch→blob for proxied PDFs; these headers help when
    // the response is framed or opened from mixed dev contexts (localhost vs IP).
    event.node.res.removeHeader('x-frame-options')
    setHeader(event, 'Cross-Origin-Resource-Policy', 'cross-origin')

    // Prefer inline display in iframe / built-in PDF viewers; only forward
    // attachment when upstream explicitly requests download.
    const disposition = res.headers.get('content-disposition') || ''
    const lower = disposition.toLowerCase()
    if (lower.includes('attachment')) {
      setHeader(event, 'Content-Disposition', disposition)
    } else {
      setHeader(
        event,
        'Content-Disposition',
        disposition && lower.includes('inline') ? disposition : 'inline',
      )
    }

    return Buffer.from(res._data)
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to proxy PDF',
    })
  }
})

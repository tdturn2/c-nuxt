import { createError, defineEventHandler, getQuery, setHeader } from 'h3'

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
        Accept: 'application/pdf,application/octet-stream,text/html;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    const contentType = res.headers.get('content-type') || 'application/pdf'
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Cache-Control', 'public, max-age=3600')

    // Preserve inline disposition if present.
    const disposition = res.headers.get('content-disposition')
    if (disposition) setHeader(event, 'Content-Disposition', disposition)

    return Buffer.from(res._data)
  } catch (err: any) {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to proxy PDF',
    })
  }
})

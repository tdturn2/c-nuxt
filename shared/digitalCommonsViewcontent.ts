/**
 * Normalize ePLACE / Digital Commons `viewcontent.cgi` query shapes.
 *
 * Solr / outbound sometimes returns legacy links:
 *   /cgi/viewcontent.cgi?article=3020&context=faithandphilosophy
 * Many stacks respond **405** to GET on that shape; the supported form uses `params`
 * (and optional `path_info` for the file name).
 */
export function normalizePlaceViewcontentSearchUrl(href: string): string {
  const trimmed = href.trim()
  if (!trimmed) return href

  try {
    const url = new URL(trimmed)
    if (!url.hostname.endsWith('place.asburyseminary.edu')) return href
    if (url.pathname.toLowerCase() !== '/cgi/viewcontent.cgi') return href

    if (url.searchParams.has('params')) {
      if (url.searchParams.get('path_info')) return href
      try {
        const rawP = url.searchParams.get('params') || ''
        const decoded = decodeURIComponent(rawP)
        if (/\/article\/\d+\//.test(decoded)) {
          const out = new URL(url.toString())
          out.searchParams.set('path_info', 'full.pdf')
          return out.toString()
        }
      } catch {
        return href
      }
      return href
    }

    const article =
      url.searchParams.get('article') ||
      url.searchParams.get('article_id')
    const context = url.searchParams.get('context')
    if (!article || !context) return href

    let pathInfo =
      url.searchParams.get('path_info') ||
      url.searchParams.get('filename') ||
      url.searchParams.get('file') ||
      ''

    // Primary PDFs are often served as `path_info=full.pdf` when Solr only
    // exposes legacy `article` + `context` (GET on that shape returns 405).
    if (!pathInfo) pathInfo = 'full.pdf'

    const out = new URL(`https://${url.host}/cgi/viewcontent.cgi`)
    out.searchParams.set('params', `/context/${context}/article/${article}/`)
    out.searchParams.set('path_info', pathInfo)

    return out.toString()
  } catch {
    return href
  }
}

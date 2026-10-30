const INTERNAL_HOSTS = new Set([
  'connect.asburyseminary.edu',
  'localhost',
  '127.0.0.1',
])

function decodeAttr(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

/** Absolute http(s) URL that leaves Connect. Emails and on-site links return null. */
export function externalHttpHref(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value || /^mailto:/i.test(value) || /^tel:/i.test(value)) return null
  if (value.includes('@') && !/^https?:\/\//i.test(value)) return null

  let href = value
  if (!/^https?:\/\//i.test(href)) {
    if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(href)) href = `https://${href}`
    else return null
  }

  try {
    const url = new URL(href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    if (!host || INTERNAL_HOSTS.has(host)) return null
    return url.href
  } catch {
    return null
  }
}

function attrValue(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    'i',
  ))
  if (!match) return null
  return match[1] ?? match[2] ?? match[3] ?? ''
}

function setAttr(attrs: string, name: string, value: string): string {
  const pattern = new RegExp(
    `((?:^|\\s))${name}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s"'>]+)`,
    'i',
  )
  if (pattern.test(attrs)) {
    return attrs.replace(pattern, `$1${name}="${value}"`)
  }
  const gap = attrs.length === 0 || /\s$/.test(attrs) ? '' : ' '
  return `${attrs}${gap}${name}="${value}"`
}

/**
 * External anchors in stored HTML open in a new tab and carry the marker
 * used by the external-link arrow.
 */
export function decorateExternalAnchors(html: string): string {
  if (!html || !html.includes('<a')) return html
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs: string, inner: string) => {
    const href = attrValue(attrs, 'href')
    if (!href || !externalHttpHref(decodeAttr(href))) return full

    let next = setAttr(attrs, 'target', '_blank')
    const rel = new Set((attrValue(next, 'rel') ?? '').split(/\s+/).filter(Boolean))
    rel.add('noopener')
    rel.add('noreferrer')
    next = setAttr(next, 'rel', [...rel].join(' '))
    if (!/\bdata-external-link\s*=/i.test(next)) {
      next = `${next}${/\s$/.test(next) ? '' : ' '}data-external-link="true"`
    }
    const wrapped = /connect-external-link-text/.test(inner)
      ? inner
      : `<span class="connect-external-link-text">${inner}</span>`
    return `<a${next}>${wrapped}</a>`
  })
}

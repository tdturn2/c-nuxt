/**
 * Keep in sync with Sites/connect-api/src/lib/messageHtml.ts
 * Admin official messages may include HTML pasted from another editor.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote',
  'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'hr', 'pre', 'code', 'span', 'div', 'sup', 'sub', 'figure', 'figcaption',
])

const VOID_TAGS = new Set(['br', 'hr', 'img'])

export function isRichMessage(body: string | null | undefined): boolean {
  return /<\/?[a-z][^>\n]*>/i.test(String(body || ''))
}

export function messagePlainText(html: string | null | undefined): string {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-4]|tr|blockquote|pre)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function safeUrl(value: string, kind: 'href' | 'src'): string | null {
  const url = value.trim().replace(/[\u0000-\u001F\s]+/g, '')
  if (!url) return null
  if (/^(https?:|mailto:)/i.test(url)) return url
  if (url.startsWith('/') && !url.startsWith('//')) return url
  if (kind === 'href' && url.startsWith('#')) return url
  if (kind === 'src' && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(url)) return url
  return null
}

function safeStyle(value: string): string {
  let style = value.replace(/\/\*[\s\S]*?\*\//g, '')
  style = style.replace(/[^;{}]*(?:expression\s*\(|javascript\s*:|behavior\s*:|@import|-moz-binding)[^;{}]*/gi, '')
  style = style.replace(/url\s*\(\s*(['"]?)\s*(?!https?:|\/|data:image\/)/gi, 'url($1#')
  return style.replace(/[<>]/g, '').trim()
}

function parseAttrs(raw: string): Array<{ name: string; value: string }> {
  const attrs: Array<{ name: string; value: string }> = []
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw))) {
    const name = match[1].toLowerCase()
    if (!/^[a-z_:][-a-z0-9_:.]*$/i.test(name)) continue
    attrs.push({ name, value: match[2] ?? match[3] ?? match[4] ?? '' })
  }
  return attrs
}

function sanitizeAttrs(tag: string, raw: string): string {
  const kept: string[] = []
  for (const attr of parseAttrs(raw)) {
    if (attr.name.startsWith('on') || attr.name === 'srcdoc') continue
    if (attr.name === 'style') {
      const style = safeStyle(attr.value)
      if (style) kept.push(`style="${style.replace(/"/g, '&quot;')}"`)
      continue
    }
    if (tag === 'a' && attr.name === 'href') {
      const href = safeUrl(attr.value, 'href')
      if (href) kept.push(`href="${href.replace(/"/g, '&quot;')}"`)
      continue
    }
    if (tag === 'img' && attr.name === 'src') {
      const src = safeUrl(attr.value, 'src')
      if (src) kept.push(`src="${src.replace(/"/g, '&quot;')}"`)
      continue
    }
    if (tag === 'img' && attr.name === 'alt') {
      kept.push(`alt="${attr.value.replace(/"/g, '&quot;')}"`)
      continue
    }
    if (tag === 'img' && attr.name === 'data-align' && /^(left|right|none)$/.test(attr.value)) {
      kept.push(`data-align="${attr.value}"`)
      continue
    }
    if (tag === 'img' && attr.name === 'data-size' && /^(small|medium|large|full)$/.test(attr.value)) {
      kept.push(`data-size="${attr.value}"`)
      continue
    }
    if ((tag === 'td' || tag === 'th') && (attr.name === 'colspan' || attr.name === 'rowspan')) {
      const span = Number.parseInt(attr.value, 10)
      if (Number.isInteger(span) && span > 0 && span <= 20) kept.push(`${attr.name}="${span}"`)
      continue
    }
    if ((tag === 'img' || tag === 'td' || tag === 'th') && (attr.name === 'width' || attr.name === 'height')) {
      if (/^\d{1,4}(?:px|%)?$/.test(attr.value.trim())) kept.push(`${attr.name}="${attr.value.trim()}"`)
    }
  }
  if (tag === 'a' && kept.some((item) => item.startsWith('href="http'))) {
    kept.push('target="_blank"', 'rel="noopener noreferrer"')
  }
  return kept.length ? ` ${kept.join(' ')}` : ''
}

export function sanitizeMessageHtml(input: string | null | undefined): string {
  let html = String(input || '')
  if (html.length > 200_000) html = html.slice(0, 200_000)
  html = html.replace(/<!--[\s\S]*?-->/g, '')
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|link|meta|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|link|meta|svg|math)\b[^>]*\/?\s*>/gi, '')
  html = html.replace(/<\/?\s*([a-zA-Z0-9]+)([^>]*)>/g, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase()
    if (!ALLOWED_TAGS.has(name)) return ''
    if (full.startsWith('</')) return VOID_TAGS.has(name) ? '' : `</${name}>`
    const clean = sanitizeAttrs(name, attrs)
    if (VOID_TAGS.has(name)) return `<${name}${clean}>`
    return `<${name}${clean}>`
  })
  return html.trim()
}

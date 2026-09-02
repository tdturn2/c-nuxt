const LEXICAL_BOLD = 1
const LEXICAL_ITALIC = 2
const LEXICAL_STRIKE = 4
const LEXICAL_UNDERLINE = 8
const LEXICAL_CODE = 16

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isYoutubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function formatPlainText(value: string, insideLink: boolean): string {
  if (insideLink) return escapeHtml(value).replace(/\n/g, '<br>')
  const urlRegex = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
  let lastIndex = 0
  let result = ''
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(value)) !== null) {
    const url = match[0]
    const start = match.index
    result += escapeHtml(value.slice(lastIndex, start)).replace(/\n/g, '<br>')
    const safeUrl = escapeHtml(url)
    result += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-asbury-blue hover:underline break-all">${safeUrl}</a>`
    lastIndex = start + url.length
  }
  result += escapeHtml(value.slice(lastIndex)).replace(/\n/g, '<br>')
  return result
}

function nodeToHtml(node: any, insideLink = false): string {
  if (!node || typeof node !== 'object') return ''

  if (node.type === 'text') {
    const raw = String(node.text || '')
    if (!raw) return ''
    const format = Number(node.format) || 0
    let text = formatPlainText(raw, insideLink)
    if (!text) return ''
    if (format & LEXICAL_CODE) text = `<code class="rounded bg-gray-100 px-1 py-0.5 text-[0.9em] font-mono">${text}</code>`
    if (format & LEXICAL_BOLD) text = `<strong>${text}</strong>`
    if (format & LEXICAL_ITALIC) text = `<em>${text}</em>`
    if (format & LEXICAL_UNDERLINE) text = `<u>${text}</u>`
    if (format & LEXICAL_STRIKE) text = `<s>${text}</s>`
    return text
  }

  if (node.type === 'linebreak' || node.type === 'lineBreak') return '<br>'

  if (node.type === 'horizontalrule' || node.type === 'horizontalRule') {
    return '<hr class="my-3 border-gray-200">'
  }

  if (node.type === 'inlineCode') {
    const raw = typeof node.text === 'string'
      ? node.text
      : (node.children || []).map((c: any) => nodeToHtml(c, true)).join('')
    return `<code class="rounded bg-gray-100 px-1 py-0.5 text-[0.9em] font-mono">${typeof node.text === 'string' ? escapeHtml(raw) : raw}</code>`
  }

  if (node.type === 'code') {
    const raw = typeof node.code === 'string'
      ? node.code
      : (node.children || []).map((c: any) => (c?.type === 'text' ? String(c.text || '') : '')).join('')
    return `<pre class="my-2 overflow-x-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs"><code class="font-mono text-gray-800">${escapeHtml(raw)}</code></pre>`
  }

  if (node.type === 'link') {
    const href = typeof node?.fields?.url === 'string' ? node.fields.url : (typeof node.url === 'string' ? node.url : '')
    const inner = (node.children || []).map((c: any) => nodeToHtml(c, true)).join('')
    if (!inner || !href) return inner
    const safeHref = escapeHtml(href)
    const newTab = !!(node?.fields?.newTab || node.newTab)
    const target = newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${safeHref}"${target} class="text-asbury-blue hover:underline break-all">${inner}</a>`
  }

  if (node.type === 'autolink') {
    const hrefRaw = node?.fields?.url || node?.url
    if (typeof hrefRaw !== 'string' || !hrefRaw) return ''
    if (isYoutubeUrl(hrefRaw)) return ''
    const inner = (node.children || []).map((c: any) => nodeToHtml(c, true)).join('')
    const safeHref = escapeHtml(hrefRaw)
    const fallback = inner || safeHref
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="text-asbury-blue hover:underline break-all">${fallback}</a>`
  }

  if (node.type === 'paragraph') {
    const inner = (node.children || []).map((c: any) => nodeToHtml(c, insideLink)).join('')
    return inner ? `<p>${inner}</p>` : ''
  }

  if (node.type === 'heading') {
    const level = Math.min(4, Math.max(1, Number(String(node.tag || 'h2').replace('h', '')) || 2))
    const tag = `h${level}`
    const inner = (node.children || []).map((c: any) => nodeToHtml(c, insideLink)).join('')
    return inner ? `<${tag}>${inner}</${tag}>` : ''
  }

  if (node.type === 'quote') {
    const inner = (node.children || []).map((c: any) => nodeToHtml(c, insideLink)).join('')
    return inner ? `<blockquote>${inner}</blockquote>` : ''
  }

  if (node.type === 'list') {
    const tag = node.listType === 'number' ? 'ol' : 'ul'
    const inner = (node.children || []).map((c: any) => nodeToHtml(c, insideLink)).join('')
    return inner ? `<${tag}>${inner}</${tag}>` : ''
  }

  if (node.type === 'listitem') {
    const inner = (node.children || []).map((c: any) => nodeToHtml(c, insideLink)).join('')
    return inner ? `<li>${inner}</li>` : ''
  }

  if (node.type === 'root' && Array.isArray(node.children)) {
    return node.children.map((c: any) => nodeToHtml(c, insideLink)).join('')
  }

  if (Array.isArray(node.children)) {
    return node.children.map((c: any) => nodeToHtml(c, insideLink)).join('')
  }

  return ''
}

/** Render post Lexical JSON as HTML (headings, lists, marks, links). Skips YouTube autolinks (shown as embeds). */
export function lexicalToPostHtml(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const root = (content as { root?: unknown }).root
  if (!root) return ''
  return nodeToHtml(root)
}

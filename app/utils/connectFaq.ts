import { parseConnectMagicJsonArray } from './connectMagicBlocks'

export type ConnectFaqItem = {
  question: string
  answer: string
  id: string
  /** TipTap document for the answer editor. Present after a rich-text edit or a saved accordion. */
  answerDoc?: { type: 'doc'; content: any[] } | null
  /** Heading that introduces this group of questions, such as "Ceremony". */
  section?: string
  uid?: string
}

const URL_RE = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
const ANCHOR_RE = /<a\s+[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

export function isSafeFaqHref(href: string): boolean {
  const value = href.trim()
  if (!value || /^\s*javascript:/i.test(value) || /^\s*data:/i.test(value)) return false
  if (value.startsWith('#') || (value.startsWith('/') && !value.startsWith('//'))) return true
  if (/^mailto:/i.test(value)) return true
  return /^https?:\/\//i.test(value)
}

function splitTrailingPunctuation(url: string): { url: string; rest: string } {
  const match = url.match(/^(.*?)([.,;:!?]+)$/)
  if (!match?.[1]) return { url, rest: '' }
  return { url: match[1], rest: match[2] }
}

function anchorHtml(href: string, label: string): string {
  const safeHref = escapeHtml(href.trim())
  const safeLabel = escapeHtml(label.trim() || href.trim())
  const external = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ''
  return `<a href="${safeHref}"${external}>${safeLabel}</a>`
}

/** Plain FAQ answer text → HTML. Stored `<a href>` tags and bare http(s) URLs become links. */
export function renderConnectFaqInlineHtml(text: string): string {
  const source = text || ''
  const parts: string[] = []
  let last = 0
  const re = new RegExp(`${ANCHOR_RE.source}|${URL_RE.source}`, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) {
    parts.push(escapeHtml(source.slice(last, match.index)))
    const raw = match[0]
    if (/^<a\s/i.test(raw)) {
      const href = (match[1] ?? match[2] ?? '').trim()
      const label = stripTags(match[3] || '').trim()
      parts.push(isSafeFaqHref(href) ? anchorHtml(href, label) : escapeHtml(raw))
    } else {
      const { url, rest } = splitTrailingPunctuation(raw)
      parts.push(anchorHtml(url, url))
      if (rest) parts.push(escapeHtml(rest))
    }
    last = match.index + raw.length
  }
  parts.push(escapeHtml(source.slice(last)))
  return parts.join('')
}

function renderLines(block: string): string[] {
  const out: string[] = []
  let prose: string[] = []
  let bullets: string[] = []
  const flushProse = () => {
    if (!prose.length) return
    out.push(`<p class="mb-2 last:mb-0">${prose.map((line) => renderConnectFaqInlineHtml(line)).join('<br>\n')}</p>`)
    prose = []
  }
  const flushBullets = () => {
    if (!bullets.length) return
    out.push(`<ul class="list-disc ml-6 my-2">${bullets.map((item) => `<li>${renderConnectFaqInlineHtml(item)}</li>`).join('')}</ul>`)
    bullets = []
  }
  for (const line of block.split('\n')) {
    const bullet = line.match(/^\s*-\s+(.*)$/)
    if (bullet) {
      flushProse()
      const item = bullet[1].trim()
      if (item) bullets.push(item)
      continue
    }
    flushBullets()
    if (line.trim()) prose.push(line.trim())
  }
  flushProse()
  flushBullets()
  return out
}

export function renderConnectFaqAnswerHtml(answer: string): string {
  const normalized = answer.replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''
  return normalized
    .split(/\n\n+/)
    .flatMap((block) => renderLines(block.trim()))
    .join('')
}

export function parseConnectFaqItems(raw: string): ConnectFaqItem[] | null {
  const text = raw.trim()
  if (!text.toLowerCase().startsWith('@connect-faq')) return null
  const parsed = parseConnectMagicJsonArray(text)
  if (!parsed) return null
  const items: ConnectFaqItem[] = []
  for (const row of parsed) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const question = String(record.question ?? '').trim()
    const answer = String(record.answer ?? '').trim()
    if (!question || !answer) continue
    const id = (typeof record.id === 'string' ? record.id : '').trim().replace(/[^a-zA-Z0-9_-]/g, '')
    items.push({ question, answer, id })
  }
  return items
}

export function buildConnectFaqHtml(raw: string): string | null {
  const text = raw.trim()
  if (!text.toLowerCase().startsWith('@connect-faq')) return null
  const jsonStr = text.replace(/^@connect-faq\s*/i, '').trim()
  if (!jsonStr) {
    return '<div class="connect-faq-block not-prose my-2 text-xs text-amber-800">@connect-faq: empty JSON</div>'
  }
  const items = parseConnectFaqItems(text)
  if (!items) {
    return '<div class="connect-faq-block not-prose my-2 text-xs text-red-600">@connect-faq: invalid JSON</div>'
  }
  if (!items.length) {
    return '<div class="connect-faq-block not-prose my-2 text-xs text-gray-500">@connect-faq: no valid items</div>'
  }
  const blocks = items.map((item) => {
    const idAttr = item.id ? ` id="${escapeHtml(item.id)}"` : ''
    return `<details${idAttr} class="group rounded-lg border border-gray-200 bg-white shadow-sm [&_summary::-webkit-details-marker]:hidden open:shadow-md"><summary class="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,94,130,0.35)] focus-visible:ring-offset-1">${escapeHtml(item.question)}</summary><div class="border-t border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700">${renderConnectFaqAnswerHtml(item.answer)}</div></details>`
  }).join('')
  return `<section class="connect-faq-block not-prose my-6 space-y-2" aria-label="Frequently asked questions">${blocks}</section>`
}

function tipTapText(text: string, href?: string): any {
  const node: any = { type: 'text', text }
  if (href) {
    node.marks = [{
      type: 'link',
      attrs: { href, target: /^https?:\/\//i.test(href) ? '_blank' : null },
    }]
  }
  return node
}

function tipTapInline(text: string): any[] {
  const source = text || ''
  const out: any[] = []
  let last = 0
  const re = new RegExp(`${ANCHOR_RE.source}|${URL_RE.source}`, 'gi')
  let match: RegExpExecArray | null
  const pushPlain = (value: string) => {
    if (value) out.push(tipTapText(value))
  }
  while ((match = re.exec(source))) {
    pushPlain(source.slice(last, match.index))
    const raw = match[0]
    if (/^<a\s/i.test(raw)) {
      const href = (match[1] ?? match[2] ?? '').trim()
      const label = stripTags(match[3] || '').trim() || href
      if (isSafeFaqHref(href) && label) out.push(tipTapText(label, href))
      else pushPlain(raw)
    } else {
      const { url, rest } = splitTrailingPunctuation(raw)
      if (url) out.push(tipTapText(url, url))
      pushPlain(rest)
    }
    last = match.index + raw.length
  }
  pushPlain(source.slice(last))
  return out
}

/** FAQ answer string → TipTap blocks (paragraphs, bullet lists, link marks). */
export function connectFaqAnswerToTipTapContent(answer: string): any[] {
  const normalized = answer.replace(/\r\n/g, '\n').trim()
  if (!normalized) return [{ type: 'paragraph', content: [] }]
  const out: any[] = []
  for (const block of normalized.split(/\n\n+/)) {
    let prose: string[] = []
    let bullets: string[] = []
    const flushProse = () => {
      if (!prose.length) return
      const content: any[] = []
      prose.forEach((line, index) => {
        if (index > 0) content.push({ type: 'hardBreak' })
        content.push(...tipTapInline(line))
      })
      out.push({ type: 'paragraph', content })
      prose = []
    }
    const flushBullets = () => {
      if (!bullets.length) return
      out.push({
        type: 'bulletList',
        content: bullets.map((item) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: tipTapInline(item) }],
        })),
      })
      bullets = []
    }
    for (const line of block.split('\n')) {
      const bullet = line.match(/^\s*-\s+(.*)$/)
      if (bullet) {
        flushProse()
        const item = bullet[1].trim()
        if (item) bullets.push(item)
        continue
      }
      flushBullets()
      if (line.trim()) prose.push(line.trim())
    }
    flushProse()
    flushBullets()
  }
  return out.length ? out : [{ type: 'paragraph', content: [] }]
}

/** Valid `@connect-faq` JSON → one editor accordion. Invalid JSON returns null. */
export function connectFaqMagicToAccordion(raw: string): any | null {
  const items = parseConnectFaqItems(raw)
  if (!items?.length) return null
  return {
    type: 'connectAccordion',
    content: items.map((item) => ({
      type: 'connectAccordionItem',
      attrs: { itemId: item.id },
      content: [
        {
          type: 'connectAccordionItemTitle',
          content: [{ type: 'text', text: item.question }],
        },
        {
          type: 'connectAccordionItemBody',
          content: connectFaqAnswerToTipTapContent(item.answer),
        },
      ],
    })),
  }
}

function inlineNodesToAnswerText(nodes: any[] | undefined): string {
  if (!Array.isArray(nodes)) return ''
  let out = ''
  for (const node of nodes) {
    if (!node) continue
    if (node.type === 'text') {
      out += node.text || ''
      continue
    }
    if (node.type === 'linebreak' || node.type === 'lineBreak' || node.type === 'hardBreak') {
      out += '\n'
      continue
    }
    if (node.type === 'link' || node.type === 'autolink') {
      const href = String(node.fields?.url || node.url || node.attrs?.href || '').trim()
      const label = inlineNodesToAnswerText(node.children || node.content)
      if (href && label && label !== href) out += `<a href="${href}">${label}</a>`
      else out += label || href
      continue
    }
    if (Array.isArray(node.children)) out += inlineNodesToAnswerText(node.children)
    else if (Array.isArray(node.content)) out += inlineNodesToAnswerText(node.content)
  }
  return out
}

function lexicalBodyToAnswer(nodes: any[] | undefined): string {
  if (!Array.isArray(nodes)) return ''
  const blocks: string[] = []
  for (const node of nodes) {
    if (!node) continue
    if (node.type === 'paragraph') {
      const text = inlineNodesToAnswerText(node.children).trim()
      if (text) blocks.push(text)
      continue
    }
    if (node.type === 'list') {
      const lines = (node.children || [])
        .map((item: any) => inlineNodesToAnswerText(item?.children).replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map((line: string) => `- ${line}`)
      if (lines.length) blocks.push(lines.join('\n'))
      continue
    }
    const text = inlineNodesToAnswerText(node.children || node.content).trim()
    if (text) blocks.push(text)
  }
  return blocks.join('\n\n')
}

function marksFromLexicalFormat(format: number): any[] {
  const marks: any[] = []
  if (format & 1) marks.push({ type: 'bold' })
  if (format & 2) marks.push({ type: 'italic' })
  if (format & 4) marks.push({ type: 'strike' })
  if (format & 8) marks.push({ type: 'underline' })
  if (format & 16) marks.push({ type: 'code' })
  return marks
}

/** Lexical accordion body → TipTap blocks, keeping bold, italic, lists, and links. */
export function lexicalChildrenToTipTapContent(nodes: any[] | undefined): any[] {
  const convertInline = (node: any): any[] => {
    if (!node) return []
    if (node.type === 'text') {
      const text = String(node.text || '')
      if (!text) return []
      const marks = marksFromLexicalFormat(Number(node.format) || 0)
      return [{ type: 'text', text, ...(marks.length ? { marks } : {}) }]
    }
    if (node.type === 'linebreak' || node.type === 'lineBreak') return [{ type: 'hardBreak' }]
    if (node.type === 'link' || node.type === 'autolink') {
      const href = String(node.fields?.url || node.url || '').trim()
      const children = (node.children || []).flatMap(convertInline)
      const linked = children.length ? children : (href ? [{ type: 'text', text: href }] : [])
      if (!href || !isSafeFaqHref(href)) return linked
      return linked.map((child: any) => {
        if (child?.type !== 'text') return child
        const marks = Array.isArray(child.marks) ? [...child.marks] : []
        marks.push({
          type: 'link',
          attrs: { href, target: /^https?:\/\//i.test(href) ? '_blank' : null },
        })
        return { ...child, marks }
      })
    }
    if (Array.isArray(node.children)) return node.children.flatMap(convertInline)
    return []
  }

  const convertBlock = (node: any): any[] => {
    if (!node) return []
    if (node.type === 'paragraph') {
      return [{ type: 'paragraph', content: (node.children || []).flatMap(convertInline) }]
    }
    if (node.type === 'heading') {
      return [{ type: 'paragraph', content: (node.children || []).flatMap(convertInline) }]
    }
    if (node.type === 'list') {
      const listType = node.listType === 'number' ? 'orderedList' : 'bulletList'
      const items = (node.children || []).map((item: any) => {
        const kids = Array.isArray(item?.children) ? item.children : []
        const hasBlocks = kids.some((child: any) => child?.type === 'paragraph' || child?.type === 'list' || child?.type === 'heading')
        const content = hasBlocks
          ? kids.flatMap((child: any) => convertBlock(child))
          : [{ type: 'paragraph', content: kids.flatMap(convertInline) }]
        return { type: 'listItem', content: content.length ? content : [{ type: 'paragraph', content: [] }] }
      })
      return items.length ? [{ type: listType, content: items }] : []
    }
    const inline = convertInline(node)
    return inline.length ? [{ type: 'paragraph', content: inline }] : []
  }

  const out = (nodes || []).flatMap(convertBlock)
  return out.length ? out : [{ type: 'paragraph', content: [] }]
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

type FaqHtmlNode = { tag: string; attrs: Record<string, string>; children: Array<FaqHtmlNode | string> }

function parseHtmlAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match: RegExpExecArray | null
  while ((match = re.exec(source))) attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? '')
  return attrs
}

function parseFaqHtml(html: string): Array<FaqHtmlNode | string> {
  const root: FaqHtmlNode = { tag: 'root', attrs: {}, children: [] }
  const stack: FaqHtmlNode[] = [root]
  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    if (match[3] != null) {
      const text = decodeHtml(match[3]).replace(/\u00a0/g, ' ')
      if (text) stack[stack.length - 1].children.push(text)
      continue
    }
    const tag = match[1].toLowerCase()
    const raw = match[0]
    const closing = raw.startsWith('</')
    const selfClosing = /\/>$/.test(raw) || tag === 'br'
    if (closing) {
      while (stack.length > 1 && stack[stack.length - 1].tag !== tag) stack.pop()
      if (stack.length > 1) stack.pop()
      continue
    }
    const node: FaqHtmlNode = { tag, attrs: parseHtmlAttrs(match[2] || ''), children: [] }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing) stack.push(node)
  }
  return root.children
}

function marksForHtmlTag(node: FaqHtmlNode, marks: any[]): any[] {
  const next = marks.map((mark) => ({ ...mark, attrs: mark.attrs ? { ...mark.attrs } : undefined }))
  const style = node.attrs.style || ''
  if (node.tag === 'strong' || node.tag === 'b' || /font-weight:\s*(bold|[6-9]00)/i.test(style)) next.push({ type: 'bold' })
  if (node.tag === 'em' || node.tag === 'i' || /font-style:\s*italic/i.test(style)) next.push({ type: 'italic' })
  if (node.tag === 'u' || /text-decoration:[^;]*underline/i.test(style)) next.push({ type: 'underline' })
  if (node.tag === 'a') {
    const href = (node.attrs.href || '').trim()
    if (isSafeFaqHref(href)) {
      next.push({ type: 'link', attrs: { href, target: /^https?:\/\//i.test(href) ? '_blank' : null } })
    }
  }
  return next
}

function inlineFromHtml(nodes: Array<FaqHtmlNode | string>, marks: any[]): any[] {
  const out: any[] = []
  for (const node of nodes) {
    if (typeof node === 'string') {
      if (!node) continue
      const textNode: any = { type: 'text', text: node }
      if (marks.length) textNode.marks = marks.map((mark) => ({ ...mark, attrs: mark.attrs ? { ...mark.attrs } : undefined }))
      out.push(textNode)
      continue
    }
    if (node.tag === 'br') {
      out.push({ type: 'hardBreak' })
      continue
    }
    out.push(...inlineFromHtml(node.children, marksForHtmlTag(node, marks)))
  }
  return out
}

function listFromHtml(node: FaqHtmlNode): any {
  const items = node.children
    .filter((child): child is FaqHtmlNode => typeof child !== 'string' && child.tag === 'li')
    .map((item) => {
      const hasBlock = item.children.some((child) => typeof child !== 'string' && ['p', 'div', 'ul', 'ol'].includes(child.tag))
      const content = hasBlock
        ? blocksFromHtml(item.children)
        : [{ type: 'paragraph', content: inlineFromHtml(item.children, []) }]
      return { type: 'listItem', content: content.length ? content : [{ type: 'paragraph', content: [] }] }
    })
  return {
    type: node.tag === 'ol' ? 'orderedList' : 'bulletList',
    content: items.length ? items : [{ type: 'listItem', content: [{ type: 'paragraph', content: [] }] }],
  }
}

function blocksFromHtml(nodes: Array<FaqHtmlNode | string>): any[] {
  const out: any[] = []
  let loose: any[] = []
  const flush = () => {
    if (!loose.length) return
    out.push({ type: 'paragraph', content: loose })
    loose = []
  }
  for (const node of nodes) {
    if (typeof node === 'string') {
      if (node.trim()) loose.push(...inlineFromHtml([node], []))
      continue
    }
    if (node.tag === 'br') {
      loose.push({ type: 'hardBreak' })
      continue
    }
    if (node.tag === 'ul' || node.tag === 'ol') {
      flush()
      out.push(listFromHtml(node))
      continue
    }
    if (node.tag === 'p' || node.tag === 'div' || /^h[1-6]$/.test(node.tag)) {
      flush()
      out.push({ type: 'paragraph', content: inlineFromHtml(node.children, []) })
      continue
    }
    loose.push(...inlineFromHtml([node], []))
  }
  flush()
  return out.length ? out : [{ type: 'paragraph', content: [] }]
}

/** Answer editor HTML → TipTap blocks. Keeps bold, italic, underline, lists, and safe links. */
export function htmlToFaqAnswerDoc(html: string): { type: 'doc'; content: any[] } {
  return { type: 'doc', content: blocksFromHtml(parseFaqHtml(html || '')) }
}

function inlineHtml(nodes: any[] | undefined): string {
  return (nodes || []).map((node) => {
    if (!node) return ''
    if (node.type === 'hardBreak') return '<br>'
    if (node.type !== 'text') return ''
    let html = escapeHtml(node.text || '')
    const marks = Array.isArray(node.marks) ? node.marks : []
    if (marks.some((mark: any) => mark?.type === 'bold')) html = `<strong>${html}</strong>`
    if (marks.some((mark: any) => mark?.type === 'italic')) html = `<em>${html}</em>`
    if (marks.some((mark: any) => mark?.type === 'underline')) html = `<u>${html}</u>`
    const link = marks.find((mark: any) => mark?.type === 'link')
    const href = String(link?.attrs?.href || '').trim()
    if (href && isSafeFaqHref(href)) {
      const external = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : ''
      html = `<a href="${escapeHtml(href)}"${external}>${html}</a>`
    }
    return html
  }).join('')
}

/** TipTap answer document → HTML for the answer field. */
export function faqAnswerDocToHtml(doc: { content?: any[] } | null | undefined): string {
  const blocks = Array.isArray(doc?.content) ? doc.content : []
  const html = blocks.map((block) => {
    if (block?.type === 'paragraph') return `<p>${inlineHtml(block.content) || '<br>'}</p>`
    if (block?.type === 'bulletList' || block?.type === 'orderedList') {
      const tag = block.type === 'orderedList' ? 'ol' : 'ul'
      const items = (block.content || []).map((item: any) => {
        const inner = (item?.content || []).map((child: any) => {
          if (child?.type === 'paragraph') return inlineHtml(child.content)
          return ''
        }).filter(Boolean).join('<br>')
        return `<li>${inner || '<br>'}</li>`
      }).join('')
      return `<${tag}>${items}</${tag}>`
    }
    return ''
  }).join('')
  return html
}

export function faqAnswerDoc(item: Pick<ConnectFaqItem, 'answer' | 'answerDoc'>): { type: 'doc'; content: any[] } {
  if (item.answerDoc?.type === 'doc' && Array.isArray(item.answerDoc.content)) {
    return JSON.parse(JSON.stringify(item.answerDoc))
  }
  return {
    type: 'doc',
    content: connectFaqAnswerToTipTapContent(item.answer || ''),
  }
}

function faqAnswerBlocks(item: ConnectFaqItem): any[] {
  if (item.answerDoc?.type === 'doc' && Array.isArray(item.answerDoc.content)) {
    const content = JSON.parse(JSON.stringify(item.answerDoc.content))
    return content.length ? content : [{ type: 'paragraph', content: [] }]
  }
  return connectFaqAnswerToTipTapContent(item.answer)
}

/** Saved Lexical accordion → the same question/answer rows the editor form uses. */
export function lexicalAccordionToFaqItems(node: any): ConnectFaqItem[] {
  if (!node || node.type !== 'accordion' || !Array.isArray(node.children)) return []
  const items: ConnectFaqItem[] = []
  for (const item of node.children) {
    if (!item || item.type !== 'accordion-item') continue
    const kids = Array.isArray(item.children) ? item.children : []
    const title = kids.find((child: any) => child?.type === 'accordion-title')
    const body = kids.find((child: any) => child?.type === 'accordion-body')
    const question = inlineNodesToAnswerText(title?.children).trim()
    const answer = lexicalBodyToAnswer(body?.children).trim()
    if (!question && !answer) continue
    const id = String(item.itemId || item.id || '').replace(/[^a-zA-Z0-9_-]/g, '')
    items.push({
      question: question || 'Question',
      answer,
      id,
      answerDoc: { type: 'doc', content: lexicalChildrenToTipTapContent(body?.children) },
    })
  }
  return items
}

export type ConnectContentSection = {
  type: 'content'
  uid: string
  doc: { type: 'doc'; content: any[] }
}

export type ConnectFaqSection = {
  type: 'faq'
  uid: string
  header: string
  items: ConnectFaqItem[]
}

export type ConnectPageSection = ConnectContentSection | ConnectFaqSection

function newSectionUid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function tipTapNodePlainText(node: any): string {
  return inlineNodesToAnswerText(node?.content || node?.children).trim()
}

/**
 * Page order of content sections and FAQ sections.
 * A heading immediately before an FAQ becomes that section's header, not page text.
 */
export function lexicalChildrenToPageSections(
  children: any[],
  plainOf: (node: any) => string | null,
  convertNode: (node: any) => any[],
  mergeSeparator: (merged: string) => string,
): ConnectPageSection[] {
  const sections: ConnectPageSection[] = []
  const buffer: any[] = []
  const flushContent = () => {
    if (!buffer.length) return
    sections.push({
      type: 'content',
      uid: newSectionUid('content'),
      doc: { type: 'doc', content: buffer.splice(0, buffer.length) },
    })
  }
  const peelHeading = () => {
    const last = buffer[buffer.length - 1]
    if (last?.type !== 'heading') return ''
    buffer.pop()
    return tipTapNodePlainText(last)
  }
  const pushFaq = (rows: ConnectFaqItem[]) => {
    const header = peelHeading()
    flushContent()
    sections.push({
      type: 'faq',
      uid: newSectionUid('faq'),
      header,
      items: rows.map((row) => ({
        ...row,
        uid: row.uid || newSectionUid('q'),
      })),
    })
  }

  let index = 0
  while (index < children.length) {
    const node = children[index]
    if (node?.type === 'accordion') {
      const rows = lexicalAccordionToFaqItems(node)
      if (rows.length) {
        pushFaq(rows)
        index += 1
        continue
      }
    }
    const plain = plainOf(node)
    if (plain && /^\s*@connect-faq\b/i.test(plain)) {
      let merged = plain
      let end = index
      const max = Math.min(children.length, index + 80)
      let parsed: ConnectFaqItem[] | null = null
      while (end < max) {
        parsed = parseConnectFaqItems(merged)
        if (parsed) break
        if (end + 1 >= children.length) break
        const nextPlain = plainOf(children[end + 1])
        if (nextPlain == null) break
        end += 1
        merged += mergeSeparator(merged) + nextPlain
      }
      if (parsed) {
        if (parsed.length) pushFaq(parsed)
        index = end + 1
        continue
      }
    }
    buffer.push(...convertNode(node))
    index += 1
  }
  flushContent()
  return sections
}

/** Save order: content nodes, then each FAQ as a heading plus its own accordion. */
export function sectionsToTipTapDoc(sections: ConnectPageSection[]) {
  const nodes: any[] = []
  const hasBody = sections.some((section) => (
    section.type === 'faq'
      ? section.items.some((item) => item.question.trim())
      : tipTapDocHasText(section.doc)
  ))
  for (const section of sections) {
    if (section.type === 'content') {
      const content = Array.isArray(section.doc?.content) ? section.doc.content : []
      if (hasBody && !tipTapDocHasText(section.doc)) continue
      nodes.push(...content)
      continue
    }
    const header = section.header.trim()
    if (header) {
      nodes.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: header }],
      })
    }
    const accordion = faqItemsToAccordion(section.items)
    if (accordion) nodes.push(accordion)
  }
  return {
    type: 'doc',
    content: nodes.length ? nodes : [{ type: 'paragraph', content: [] }],
  }
}

function tipTapDocHasText(doc: any): boolean {
  const walk = (nodes: any[] | undefined): boolean => {
    if (!Array.isArray(nodes)) return false
    for (const node of nodes) {
      if (node?.type === 'image') return true
      if (node?.type === 'text' && String(node.text || '').trim()) return true
      if (node?.content && walk(node.content)) return true
    }
    return false
  }
  return walk(doc?.content)
}

/** Question rows → a TipTap accordion node the save converter already understands. */
export function faqItemsToAccordion(items: ConnectFaqItem[]): any | null {
  const usable = items
    .map((item) => ({
      question: item.question.trim(),
      id: item.id.trim().replace(/[^a-zA-Z0-9_-]/g, ''),
      content: faqAnswerBlocks(item),
    }))
    .filter((item) => item.question)
  if (!usable.length) return null
  return {
    type: 'connectAccordion',
    content: usable.map((item) => ({
      type: 'connectAccordionItem',
      attrs: { itemId: item.id },
      content: [
        {
          type: 'connectAccordionItemTitle',
          content: [{ type: 'text', text: item.question }],
        },
        {
          type: 'connectAccordionItemBody',
          content: item.content,
        },
      ],
    })),
  }
}

/**
 * Pull FAQ rows out of the page body. They are edited in a form, not as ProseMirror nodes.
 * Invalid `@connect-faq` JSON stays in `content` and does not consume the following blocks.
 */
export function separateFaqFromLexicalChildren(
  children: any[],
  plainOf: (node: any) => string | null,
  convertNode: (node: any) => any[],
  mergeSeparator: (merged: string) => string,
): { content: any[]; faqItems: ConnectFaqItem[]; faqAt: number } {
  const content: any[] = []
  const faqItems: ConnectFaqItem[] = []
  let faqAt = 0
  let seenFaq = false
  let section = ''
  let index = 0
  const withSection = (rows: ConnectFaqItem[]) => rows.map((row) => ({
    ...row,
    section: row.section || section,
  }))
  while (index < children.length) {
    const node = children[index]
    if (node?.type === 'heading') {
      const text = inlineNodesToAnswerText(node.children).trim()
      if (text) section = text
      content.push(...convertNode(node))
      index += 1
      continue
    }
    if (node?.type === 'accordion') {
      const rows = lexicalAccordionToFaqItems(node)
      if (rows.length) {
        if (!seenFaq) {
          faqAt = content.length
          seenFaq = true
        }
        faqItems.push(...withSection(rows))
        index += 1
        continue
      }
    }
    const plain = plainOf(node)
    if (plain && /^\s*@connect-faq\b/i.test(plain)) {
      let merged = plain
      let end = index
      const max = Math.min(children.length, index + 80)
      let parsed: ConnectFaqItem[] | null = null
      while (end < max) {
        parsed = parseConnectFaqItems(merged)
        if (parsed) break
        if (end + 1 >= children.length) break
        const nextPlain = plainOf(children[end + 1])
        if (nextPlain == null) break
        end += 1
        merged += mergeSeparator(merged) + nextPlain
      }
      if (parsed) {
        if (parsed.length) {
          if (!seenFaq) {
            faqAt = content.length
            seenFaq = true
          }
          faqItems.push(...withSection(parsed))
        }
        index = end + 1
        continue
      }
    }
    content.push(...convertNode(node))
    index += 1
  }
  return { content, faqItems, faqAt }
}

/**
 * Turn top-level `@connect-faq` nodes into accordions.
 * Invalid JSON stays as the original node and does not consume the nodes after it.
 */
export function mapLexicalChildrenWithFaq(
  children: any[],
  plainOf: (node: any) => string | null,
  convertNode: (node: any) => any[],
  mergeSeparator: (merged: string) => string,
): any[] {
  const content: any[] = []
  let index = 0
  while (index < children.length) {
    const plain = plainOf(children[index])
    if (plain && /^\s*@connect-faq\b/i.test(plain)) {
      let merged = plain
      let end = index
      const max = Math.min(children.length, index + 80)
      let accordion: any = null
      while (end < max) {
        accordion = connectFaqMagicToAccordion(merged)
        if (accordion) break
        if (end + 1 >= children.length) break
        const nextPlain = plainOf(children[end + 1])
        if (nextPlain == null) break
        end += 1
        merged += mergeSeparator(merged) + nextPlain
      }
      if (accordion) {
        content.push(accordion)
        index = end + 1
        continue
      }
    }
    content.push(...convertNode(children[index]))
    index += 1
  }
  return content
}

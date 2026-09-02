/** Empty TipTap JSON. Paragraphs use `content: []` — ProseMirror forbids empty text nodes. */
export const INITIAL_TIPTAP_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [] }],
} as const

const LEXICAL_BOLD = 1
const LEXICAL_ITALIC = 2
const LEXICAL_STRIKE = 4
const LEXICAL_UNDERLINE = 8
const LEXICAL_CODE = 16

export function cloneTipTapDoc(doc: unknown): any {
  return JSON.parse(JSON.stringify(doc ?? INITIAL_TIPTAP_DOC))
}

/**
 * ProseMirror throws on `{ type: 'text', text: '' }`.
 * Drop unknown custom nodes so they cannot blank the editor.
 */
export function sanitizeTipTapJsonForProseMirror(input: unknown): any {
  const unknownBlockTypes = new Set([
    'connectAccordion',
    'connectAccordionItem',
    'connectAccordionItemTitle',
    'connectAccordionItemBody',
  ])
  const walk = (n: any): any => {
    if (n == null || typeof n !== 'object') return n
    if (n.type === 'text') {
      const t = n.text != null ? String(n.text) : ''
      if (t.length === 0) return null
      return { ...n, text: t }
    }
    if (Array.isArray(n)) return n.map(walk).filter((x) => x != null)
    if (typeof n.type === 'string' && unknownBlockTypes.has(n.type)) return null
    const out: any = { ...n }
    if (Array.isArray(n.content)) out.content = n.content.map(walk).filter((x: any) => x != null)
    return out
  }
  return walk(JSON.parse(JSON.stringify(input ?? INITIAL_TIPTAP_DOC)))
}

export function tipTapDocHasMeaningfulText(doc: any): boolean {
  const walk = (nodes: any[] | undefined): boolean => {
    if (!Array.isArray(nodes)) return false
    for (const n of nodes) {
      if (n?.type === 'horizontalRule') return true
      if (n?.type === 'text' && String(n.text || '').trim()) return true
      if (n?.content && walk(n.content)) return true
    }
    return false
  }
  return walk(doc?.content)
}

export function extractUrlsFromTipTap(doc: any): string[] {
  const urls: string[] = []
  const urlRegex = /\bhttps?:\/\/[^\s<>"')\]}]+/gi
  const walk = (nodes: any[] | undefined) => {
    if (!Array.isArray(nodes)) return
    for (const n of nodes) {
      if (!n) continue
      if (n.type === 'text') {
        const href = (n.marks || []).find((m: any) => m?.type === 'link')?.attrs?.href
        if (typeof href === 'string' && href) urls.push(href)
        const matches = String(n.text || '').match(urlRegex)
        if (matches?.length) urls.push(...matches)
      }
      if (Array.isArray(n.content)) walk(n.content)
    }
  }
  walk(doc?.content)
  return urls
}

function marksFromLexicalFormat(format: unknown): any[] {
  const n = Number(format) || 0
  const marks: any[] = []
  if (n & LEXICAL_BOLD) marks.push({ type: 'bold' })
  if (n & LEXICAL_ITALIC) marks.push({ type: 'italic' })
  if (n & LEXICAL_STRIKE) marks.push({ type: 'strike' })
  if (n & LEXICAL_UNDERLINE) marks.push({ type: 'underline' })
  if (n & LEXICAL_CODE) marks.push({ type: 'code' })
  return marks
}

function formatFromMarks(marks: any[] | undefined): number {
  let format = 0
  for (const m of marks || []) {
    if (m?.type === 'bold') format |= LEXICAL_BOLD
    if (m?.type === 'italic') format |= LEXICAL_ITALIC
    if (m?.type === 'strike') format |= LEXICAL_STRIKE
    if (m?.type === 'underline') format |= LEXICAL_UNDERLINE
    if (m?.type === 'code') format |= LEXICAL_CODE
  }
  return format
}

/** Split multiline Lexical text into TipTap text + hardBreak nodes. */
export function tipTapInlineFromMultilineString(s: string, marks: any[] = []): any[] {
  const lines = s.replace(/\r\n/g, '\n').split('\n')
  const out: any[] = []
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) out.push({ type: 'hardBreak' })
    const line = lines[i] ?? ''
    if (line.length > 0) {
      out.push({ type: 'text', text: line, ...(marks.length ? { marks } : {}) })
    }
  }
  return out
}

function lexicalPlainFromNodes(nodes: unknown): string {
  if (nodes == null) return ''
  if (Array.isArray(nodes)) {
    let out = ''
    for (const n of nodes) out += lexicalPlainFromNodes(n)
    return out
  }
  if (typeof nodes !== 'object') return ''
  const n = nodes as any
  if (n.type === 'text' && typeof n.text === 'string') return n.text
  if (n.type === 'linebreak' || n.type === 'lineBreak') return '\n'
  if (Array.isArray(n.children)) return lexicalPlainFromNodes(n.children)
  return ''
}

function asBlockContent(converted: any[]): any[] {
  const blockTypes = new Set([
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'blockquote',
    'codeBlock',
    'horizontalRule',
  ])
  if (!converted.length) return [{ type: 'paragraph', content: [] }]
  if (converted.every((child) => blockTypes.has(child?.type))) return converted
  return [{ type: 'paragraph', content: converted }]
}

export function lexicalToTipTap(lexical: any): any {
  if (!lexical?.root?.children) return cloneTipTapDoc(INITIAL_TIPTAP_DOC)

  const convert = (node: any): any[] => {
    if (!node) return []

    if (node.type === 'text') {
      const marks = marksFromLexicalFormat(node.format)
      return tipTapInlineFromMultilineString(String(node.text || ''), marks)
    }

    if (node.type === 'inlineCode') {
      const raw =
        typeof node.text === 'string'
          ? node.text
          : (node.children || [])
              .filter((c: any) => c?.type === 'text')
              .map((c: any) => c.text || '')
              .join('')
      return raw ? [{ type: 'text', text: raw, marks: [{ type: 'code' }] }] : []
    }

    if (node.type === 'code') {
      const fromField = typeof node.code === 'string' ? node.code : ''
      const fromChildren = lexicalPlainFromNodes(node.children || []).replace(/\r\n/g, '\n')
      const text = (fromField || fromChildren).replace(/\r\n/g, '\n')
      const langRaw = node.language
      const language =
        langRaw != null && String(langRaw).trim() !== '' ? String(langRaw).trim() : null
      return [
        {
          type: 'codeBlock',
          attrs: { language },
          content: text ? [{ type: 'text', text }] : [],
        },
      ]
    }

    if (node.type === 'linebreak' || node.type === 'lineBreak') {
      return [{ type: 'hardBreak' }]
    }

    if (node.type === 'horizontalrule' || node.type === 'horizontalRule') {
      return [{ type: 'horizontalRule' }]
    }

    if (node.type === 'paragraph') {
      const content = (node.children || []).flatMap(convert)
      return [{ type: 'paragraph', content: content.length ? content : [] }]
    }

    if (node.type === 'heading') {
      const level = Number(String(node.tag || 'h2').replace('h', '')) || 2
      const content = (node.children || []).flatMap(convert)
      return [{ type: 'heading', attrs: { level }, content }]
    }

    if (node.type === 'quote') {
      const inner = (node.children || []).flatMap(convert)
      return [{ type: 'blockquote', content: asBlockContent(inner) }]
    }

    if (node.type === 'list') {
      const listType = node.listType === 'number' ? 'orderedList' : 'bulletList'
      const content = (node.children || []).flatMap(convert)
      return [{ type: listType, content }]
    }

    if (node.type === 'listitem') {
      const inner = (node.children || []).flatMap(convert)
      const content = inner.length && inner.some((n: any) => n.type === 'paragraph')
        ? inner
        : [{ type: 'paragraph', content: inner.length ? inner : [] }]
      return [{ type: 'listItem', content }]
    }

    if (node.type === 'link') {
      const href = node?.fields?.url || node?.url
      const newTab = !!(node?.fields?.newTab || node.newTab)
      const children = (node.children || []).flatMap(convert)
      return children.map((c: any) => {
        const marks = Array.isArray(c.marks) ? [...c.marks] : []
        marks.push({ type: 'link', attrs: { href, target: newTab ? '_blank' : null } })
        return { ...c, marks }
      })
    }

    if (node.type === 'autolink') {
      const href = node?.fields?.url || node?.url
      const children = (node.children || []).flatMap(convert)
      const linked = children.length ? children : [{ type: 'text', text: href }]
      return linked.map((c: any) => {
        const marks = Array.isArray(c.marks) ? [...c.marks] : []
        marks.push({ type: 'link', attrs: { href, target: '_blank' } })
        return { ...c, marks }
      })
    }

    if (Array.isArray(node.children)) {
      return node.children.flatMap(convert)
    }

    return []
  }

  const content = lexical.root.children.flatMap(convert)
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph', content: [] }],
  }
}

function lexicalTextNode(text: string, marks?: any[]): any {
  return {
    mode: 'normal',
    text,
    type: 'text',
    style: '',
    detail: 0,
    format: formatFromMarks(marks),
    version: 1,
  }
}

function wrapWithLinkIfNeeded(nodes: any[], marks: any[] | undefined): any[] {
  const linkMark = (marks || []).find((m) => m?.type === 'link')
  const href = linkMark?.attrs?.href
  if (!href) return nodes
  const newTab = linkMark?.attrs?.target === '_blank'
  return [{
    type: 'link',
    fields: { url: href, newTab, linkType: 'custom' },
    format: '',
    indent: 0,
    version: 3,
    children: nodes,
    direction: null,
  }]
}

function emptyLexicalParagraph(): any {
  return {
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    children: [],
    direction: null,
    textStyle: '',
    textFormat: 0,
  }
}

function tipTapFragmentPlainText(nodes: any[] | undefined): string {
  if (!Array.isArray(nodes) || !nodes.length) return ''
  let s = ''
  for (const n of nodes) {
    if (n?.type === 'text') s += n.text || ''
    else if (n?.type === 'hardBreak') s += '\n'
    else if (Array.isArray(n.content)) s += tipTapFragmentPlainText(n.content)
  }
  return s
}

export function emptyLexicalDoc(): any {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [emptyLexicalParagraph()],
      direction: null,
    },
  }
}

export function tipTapToLexical(tipTap: any): any {
  if (!tipTap || tipTap.type !== 'doc') return emptyLexicalDoc()

  const convert = (node: any): any[] => {
    if (!node) return []

    if (node.type === 'text') {
      const text = node.text || ''
      if (!text) return []
      return wrapWithLinkIfNeeded([lexicalTextNode(text, node.marks)], node.marks)
    }

    if (node.type === 'hardBreak') {
      return [{ type: 'linebreak', version: 1 }]
    }

    if (node.type === 'horizontalRule') {
      return [{ type: 'horizontalrule', version: 1 }]
    }

    if (node.type === 'paragraph') {
      return [{
        ...emptyLexicalParagraph(),
        children: (node.content || []).flatMap(convert),
      }]
    }

    if (node.type === 'heading') {
      const level = node?.attrs?.level || 2
      return [{
        type: 'heading',
        tag: `h${level}`,
        format: '',
        indent: 0,
        version: 1,
        children: (node.content || []).flatMap(convert),
        direction: null,
      }]
    }

    if (node.type === 'blockquote') {
      return [{
        type: 'quote',
        format: '',
        indent: 0,
        version: 1,
        children: (node.content || []).flatMap(convert),
        direction: null,
      }]
    }

    if (node.type === 'bulletList' || node.type === 'orderedList') {
      const listType = node.type === 'orderedList' ? 'number' : 'bullet'
      return [{
        type: 'list',
        listType,
        tag: listType === 'number' ? 'ol' : 'ul',
        start: 1,
        format: '',
        indent: 0,
        version: 1,
        children: (node.content || []).flatMap(convert),
        direction: null,
      }]
    }

    if (node.type === 'listItem') {
      return [{
        type: 'listitem',
        value: 1,
        format: '',
        indent: 0,
        version: 1,
        children: (node.content || []).flatMap(convert),
        direction: null,
      }]
    }

    if (node.type === 'codeBlock') {
      const codeStr = tipTapFragmentPlainText(node.content)
      const textChildren = codeStr ? [lexicalTextNode(codeStr)] : []
      return [{
        type: 'code',
        version: 1,
        language: String(node.attrs?.language ?? '') || 'plaintext',
        format: '',
        indent: 0,
        direction: null,
        children: textChildren,
      }]
    }

    if (Array.isArray(node.content)) return node.content.flatMap(convert)
    return []
  }

  const children = (tipTap.content || []).flatMap(convert)
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: children.length ? children : [emptyLexicalParagraph()],
      direction: null,
    },
  }
}

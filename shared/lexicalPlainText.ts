/** Extract searchable plain text from Payload Lexical JSON (or plain/html content). */
export function extractLexicalPlainText(content: unknown, maxLength = 600): string {
  if (content == null) return ''
  if (typeof content === 'string') {
    const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return truncate(text, maxLength)
  }
  if (typeof content === 'object' && content !== null && 'html' in content) {
    const html = String((content as { html?: string }).html ?? '')
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return truncate(text, maxLength)
  }

  const root = (content as { root?: { children?: unknown } })?.root
  if (!root) return ''

  const collect = (nodes: unknown): string => {
    if (nodes == null) return ''
    if (Array.isArray(nodes)) {
      let out = ''
      for (const node of nodes) out += collect(node)
      return out
    }
    if (typeof nodes !== 'object') return ''
    const node = nodes as { type?: string; text?: string; children?: unknown }
    if (node.type === 'text' && typeof node.text === 'string') return node.text
    if (node.type === 'linebreak' || node.type === 'lineBreak') return ' '
    if (
      node.type === 'accordion' ||
      node.type === 'accordion-item' ||
      node.type === 'accordion-title' ||
      node.type === 'accordion-body'
    ) {
      if (Array.isArray(node.children)) return collect(node.children)
      return ''
    }
    if (Array.isArray(node.children)) return collect(node.children)
    return ''
  }

  const text = collect(root.children).replace(/\s+/g, ' ').trim()
  return truncate(text, maxLength)
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}…`
}

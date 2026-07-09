/** Shared helpers for @connect-videos / @connect-faq magic blocks in Lexical + TipTap. */

export function isConnectVideosMagic(raw: string): boolean {
  return raw.trim().toLowerCase().startsWith('@connect-videos')
}

export function isConnectFaqMagic(raw: string): boolean {
  return raw.trim().toLowerCase().startsWith('@connect-faq')
}

export function isConnectJsonMagic(raw: string): boolean {
  return isConnectVideosMagic(raw) || isConnectFaqMagic(raw)
}

/** Separator when merging editor paragraphs that belong to one magic block. */
export function connectMagicMergeSeparator(mergedSoFar: string): string {
  return isConnectJsonMagic(mergedSoFar) ? '' : '\n'
}

/**
 * Rich-text editors often insert hard breaks / newlines inside a visually single line.
 * Those literal newlines inside JSON strings or numbers make JSON.parse fail.
 */
export function normalizeConnectMagicJsonPayload(kind: 'videos' | 'faq', jsonStr: string): string {
  let s = jsonStr
    .replace(/&amp;/g, '&')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")

  if (kind === 'videos') {
    s = s.replace(/[\r\n]+/g, '')
  } else {
    // FAQ: fix paragraph splits between array items; collapse stray breaks elsewhere.
    s = s.replace(/}\s*[\r\n]+\s*{/g, '},{')
    s = s.replace(/[\r\n]+/g, ' ')
  }

  return s.trim()
}

export function extractConnectMagicJsonStr(raw: string): { kind: 'videos' | 'faq'; jsonStr: string } | null {
  const t = raw.trim()
  const low = t.toLowerCase()
  if (low.startsWith('@connect-videos')) {
    return { kind: 'videos', jsonStr: t.replace(/^@connect-videos\s*/i, '').trim() }
  }
  if (low.startsWith('@connect-faq')) {
    return { kind: 'faq', jsonStr: t.replace(/^@connect-faq\s*/i, '').trim() }
  }
  return null
}

export function parseConnectMagicJsonArray(raw: string): unknown[] | null {
  const extracted = extractConnectMagicJsonStr(raw)
  if (!extracted || !extracted.jsonStr) return null
  const normalized = normalizeConnectMagicJsonPayload(extracted.kind, extracted.jsonStr)
  try {
    const parsed = JSON.parse(normalized)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function connectMagicBlockJsonParses(raw: string): boolean {
  return parseConnectMagicJsonArray(raw) != null
}

/** Collect Lexical/TipTap plain text for magic blocks without hard-break newlines. */
export function collectConnectMagicPlainText(nodes: unknown): string {
  if (nodes == null) return ''
  if (Array.isArray(nodes)) {
    let out = ''
    for (const n of nodes) out += collectConnectMagicPlainText(n)
    return out
  }
  if (typeof nodes !== 'object') return ''
  const n = nodes as Record<string, unknown>
  if (n.type === 'text') return typeof n.text === 'string' ? n.text : ''
  if (n.type === 'linebreak' || n.type === 'lineBreak' || n.type === 'hardBreak') return ''
  if (Array.isArray(n.children)) return collectConnectMagicPlainText(n.children)
  if (Array.isArray(n.content)) return collectConnectMagicPlainText(n.content)
  return ''
}

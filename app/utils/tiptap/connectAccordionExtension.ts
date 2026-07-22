/**
 * TipTap ↔ Lexical conversion for Connect rich accordions.
 * TipTap node registration lives in connectAccordionNodes.ts (loaded only when
 * registering extensions — avoids pulling a second TipTap/PluginKey instance into
 * Nuxt UI's editor unless aliases are verified).
 */

export const CONNECT_ACCORDION_LEXICAL_TYPE = 'accordion'
export const CONNECT_ACCORDION_ITEM_LEXICAL_TYPE = 'accordion-item'
export const CONNECT_ACCORDION_TITLE_LEXICAL_TYPE = 'accordion-title'
export const CONNECT_ACCORDION_BODY_LEXICAL_TYPE = 'accordion-body'

export function createEmptyAccordionItemJson(itemId = '') {
  return {
    type: 'connectAccordionItem',
    attrs: { itemId },
    content: [
      {
        type: 'connectAccordionItemTitle',
        content: [{ type: 'text', text: 'New question' }],
      },
      {
        type: 'connectAccordionItemBody',
        content: [{ type: 'paragraph', content: [] }],
      },
    ],
  }
}

export function createEmptyAccordionJson() {
  return {
    type: 'connectAccordion',
    content: [createEmptyAccordionItemJson()],
  }
}

/**
 * Lexical accordion → TipTap JSON nodes (one connectAccordion).
 */
export function lexicalAccordionToTipTap(
  node: any,
  convertChildren: (child: any) => any[],
): any[] {
  if (!node || node.type !== CONNECT_ACCORDION_LEXICAL_TYPE) return []
  const items = (Array.isArray(node.children) ? node.children : [])
    .map((item: any) => lexicalAccordionItemToTipTap(item, convertChildren))
    .filter(Boolean)
  if (!items.length) {
    return [createEmptyAccordionJson()]
  }
  return [{ type: 'connectAccordion', content: items }]
}

function lexicalAccordionItemToTipTap(
  item: any,
  convertChildren: (child: any) => any[],
): any | null {
  if (!item || item.type !== CONNECT_ACCORDION_ITEM_LEXICAL_TYPE) return null
  const kids = Array.isArray(item.children) ? item.children : []
  const titleNode = kids.find((c: any) => c?.type === CONNECT_ACCORDION_TITLE_LEXICAL_TYPE)
  const bodyNode = kids.find((c: any) => c?.type === CONNECT_ACCORDION_BODY_LEXICAL_TYPE)

  let titleContent = titleNode
    ? (titleNode.children || []).flatMap(convertChildren)
    : [{ type: 'text', text: String(item.title || item.question || 'Question') }]

  titleContent = flattenInlineOnly(titleContent)
  if (!titleContent.length) titleContent = [{ type: 'text', text: 'Question' }]

  let bodyContent = bodyNode
    ? (bodyNode.children || []).flatMap(convertChildren)
    : kids
        .filter(
          (c: any) =>
            c?.type !== CONNECT_ACCORDION_TITLE_LEXICAL_TYPE &&
            c?.type !== CONNECT_ACCORDION_BODY_LEXICAL_TYPE,
        )
        .flatMap(convertChildren)

  bodyContent = ensureBlockContent(bodyContent)

  const itemId = String(item.itemId || item.id || '').replace(/[^a-zA-Z0-9_-]/g, '')

  return {
    type: 'connectAccordionItem',
    attrs: { itemId },
    content: [
      { type: 'connectAccordionItemTitle', content: titleContent },
      { type: 'connectAccordionItemBody', content: bodyContent },
    ],
  }
}

/**
 * TipTap connectAccordion → Lexical accordion node(s).
 */
export function tipTapAccordionToLexical(
  node: any,
  convertChildren: (child: any) => any[],
): any[] {
  if (!node || node.type !== 'connectAccordion') return []
  const items = (Array.isArray(node.content) ? node.content : [])
    .map((item: any) => tipTapAccordionItemToLexical(item, convertChildren))
    .filter(Boolean)
  if (!items.length) return []
  return [
    {
      type: CONNECT_ACCORDION_LEXICAL_TYPE,
      version: 1,
      format: '',
      indent: 0,
      direction: null,
      children: items,
    },
  ]
}

function tipTapAccordionItemToLexical(
  item: any,
  convertChildren: (child: any) => any[],
): any | null {
  if (!item || item.type !== 'connectAccordionItem') return null
  const kids = Array.isArray(item.content) ? item.content : []
  const title = kids.find((c: any) => c?.type === 'connectAccordionItemTitle')
  const body = kids.find((c: any) => c?.type === 'connectAccordionItemBody')

  const titleChildren = title ? (title.content || []).flatMap(convertChildren) : []
  const bodyChildren = body ? (body.content || []).flatMap(convertChildren) : []

  const itemId = String(item.attrs?.itemId || '').replace(/[^a-zA-Z0-9_-]/g, '')

  return {
    type: CONNECT_ACCORDION_ITEM_LEXICAL_TYPE,
    version: 1,
    format: '',
    indent: 0,
    direction: null,
    ...(itemId ? { itemId } : {}),
    children: [
      {
        type: CONNECT_ACCORDION_TITLE_LEXICAL_TYPE,
        version: 1,
        format: '',
        indent: 0,
        direction: null,
        children: titleChildren.length
          ? titleChildren
          : [
              {
                type: 'text',
                text: 'Question',
                format: 0,
                mode: 'normal',
                style: '',
                detail: 0,
                version: 1,
              },
            ],
      },
      {
        type: CONNECT_ACCORDION_BODY_LEXICAL_TYPE,
        version: 1,
        format: '',
        indent: 0,
        direction: null,
        children: bodyChildren.length
          ? bodyChildren
          : [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                children: [],
                direction: null,
                textStyle: '',
                textFormat: 0,
              },
            ],
      },
    ],
  }
}

function flattenInlineOnly(nodes: any[]): any[] {
  const out: any[] = []
  for (const n of nodes || []) {
    if (!n) continue
    if (n.type === 'text' || n.type === 'hardBreak') {
      out.push(n)
      continue
    }
    if (Array.isArray(n.content)) {
      out.push(...flattenInlineOnly(n.content))
    }
  }
  return out
}

function ensureBlockContent(nodes: any[]): any[] {
  if (!nodes?.length) return [{ type: 'paragraph', content: [] }]
  const hasBlock = nodes.some(
    (n) =>
      n &&
      n.type &&
      n.type !== 'text' &&
      n.type !== 'hardBreak',
  )
  if (hasBlock) return nodes
  return [{ type: 'paragraph', content: nodes }]
}

import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { tipTapAccordionToLexical } from '../app/utils/tiptap/connectAccordionExtension'
import { createConnectAccordionExtensions } from '../app/utils/tiptap/connectAccordionNodes'
import {
  buildConnectFaqHtml,
  connectFaqMagicToAccordion,
  faqAnswerDoc,
  faqAnswerDocToHtml,
  faqItemsToAccordion,
  htmlToFaqAnswerDoc,
  lexicalAccordionToFaqItems,
  lexicalChildrenToPageSections,
  mapLexicalChildrenWithFaq,
  sectionsToTipTapDoc,
  separateFaqFromLexicalChildren,
} from '../app/utils/connectFaq'

const commencementAnswer = [
  'The campus store is located in the Sherman Thor Student Center.',
  'Hours:\n- TBD',
  'An extension of the campus store is open in the Asbury Inn. Visit https://connect.asburyseminary.edu/store.',
].join('\n\n')

function faqRaw(items: unknown[]) {
  return `@connect-faq ${JSON.stringify(items)}`
}

function convertAccordionChild(node: any): any[] {
  if (!node) return []
  if (node.type === 'text') {
    const textNode = {
      type: 'text',
      text: node.text || '',
      format: 0,
      mode: 'normal',
      style: '',
      detail: 0,
      version: 1,
    }
    const href = (node.marks || []).find((mark: any) => mark?.type === 'link')?.attrs?.href
    if (!href) return [textNode]
    return [{
      type: 'link',
      fields: { url: href },
      version: 1,
      children: [textNode],
    }]
  }
  if (node.type === 'hardBreak') return [{ type: 'linebreak', version: 1 }]
  if (node.type === 'paragraph' || node.type === 'bulletList' || node.type === 'listItem') {
    const type = node.type === 'paragraph' ? 'paragraph' : node.type === 'bulletList' ? 'list' : 'listitem'
    return [{
      type,
      ...(type === 'list' ? { listType: 'bullet' } : {}),
      version: 1,
      children: (node.content || []).flatMap(convertAccordionChild),
    }]
  }
  if (Array.isArray(node.content)) return node.content.flatMap(convertAccordionChild)
  return []
}

function collect(node: any, hit: (node: any) => void) {
  if (!node || typeof node !== 'object') return
  hit(node)
  for (const child of node.children || node.content || []) collect(child, hit)
}

describe('legacy @connect-faq html', () => {
  it('renders paragraphs, a list, a link, and the item id', () => {
    const html = buildConnectFaqHtml(faqRaw([{
      question: 'Where can buy Asbury Seminary memorabilia?',
      answer: commencementAnswer,
      id: 'where-can-buy-asbury-seminary-memorabilia',
    }]))
    expect(html).toContain('id="where-can-buy-asbury-seminary-memorabilia"')
    expect(html).toContain('<p class="mb-2 last:mb-0">The campus store is located in the Sherman Thor Student Center.</p>')
    expect(html).toContain('<ul class="list-disc ml-6 my-2"><li>TBD</li></ul>')
    expect(html).toContain('<a href="https://connect.asburyseminary.edu/store" target="_blank" rel="noopener noreferrer">https://connect.asburyseminary.edu/store</a>')
    expect(html).not.toContain('store.</a>')
  })

  it('keeps a stored anchor and escapes an unsafe one', () => {
    const html = buildConnectFaqHtml(faqRaw([{
      question: 'Details',
      answer: 'Read <a href="/registrar/graduation">graduation</a>. Do not <a href="javascript:alert(1)">click</a>.',
    }]))
    expect(html).toContain('<a href="/registrar/graduation">graduation</a>')
    expect(html).not.toContain('href="javascript:alert(1)"')
    expect(html).toContain('&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt;')
  })

  it('reports invalid JSON instead of dropping the block', () => {
    const html = buildConnectFaqHtml('@connect-faq [{')
    expect(html).toContain('@connect-faq: invalid JSON')
  })
})

describe('@connect-faq editor conversion', () => {
  it('round-trips question, answer text, link, and id through an accordion', () => {
    const accordion = connectFaqMagicToAccordion(faqRaw([{
      question: 'Where can buy Asbury Seminary memorabilia?',
      answer: commencementAnswer,
      id: 'where-can-buy-asbury-seminary-memorabilia',
    }]))
    expect(accordion?.type).toBe('connectAccordion')

    const lexical = tipTapAccordionToLexical(accordion, convertAccordionChild)
    expect(lexical[0].type).toBe('accordion')
    expect(lexical[0].children[0].itemId).toBe('where-can-buy-asbury-seminary-memorabilia')

    const texts: string[] = []
    const hrefs: string[] = []
    collect(lexical[0], (node) => {
      if (node.type === 'text' && node.text) texts.push(node.text)
      if (node.type === 'link') hrefs.push(node.fields.url)
      if (node.type === 'list') expect(node.listType).toBe('bullet')
    })
    expect(texts).toContain('Where can buy Asbury Seminary memorabilia?')
    expect(texts).toContain('TBD')
    expect(texts).toContain('https://connect.asburyseminary.edu/store')
    expect(hrefs).toContain('https://connect.asburyseminary.edu/store')
  })

  it('pulls questions out of the page body instead of leaving the editor empty', () => {
    const nodes = [
      { type: 'code', text: faqRaw([{
        question: 'Where can buy Asbury Seminary memorabilia?',
        answer: commencementAnswer,
        id: 'where-can-buy-asbury-seminary-memorabilia',
      }]) },
      { type: 'paragraph', text: 'More information is on the registrar page.' },
    ]
    const separated = separateFaqFromLexicalChildren(
      nodes,
      (node) => node.text,
      (node) => [{ type: 'paragraph', content: [{ type: 'text', text: node.text }] }],
      () => '',
    )
    expect(separated.faqItems).toHaveLength(1)
    expect(separated.faqItems[0].id).toBe('where-can-buy-asbury-seminary-memorabilia')
    expect(separated.faqItems[0].answer).toContain('Hours:\n- TBD')
    expect(separated.content.map((node) => node.content[0].text)).toEqual([
      'More information is on the registrar page.',
    ])
    expect(separated.content.some((node) => node.type === 'connectAccordion')).toBe(false)
  })

  it('keeps the heading above a group of questions', () => {
    const separated = separateFaqFromLexicalChildren(
      [
        { type: 'heading', children: [{ type: 'text', text: 'Ceremony' }] },
        { type: 'code', text: faqRaw([{ question: 'Are tickets required?', answer: 'Yes.', id: 'tickets' }]) },
      ],
      (node) => (node.type === 'code' ? node.text : null),
      (node) => [{ type: node.type }],
      () => '',
    )
    expect(separated.faqItems[0].question).toBe('Are tickets required?')
    expect(separated.faqItems[0].section).toBe('Ceremony')
    expect(separated.content.map((node) => node.type)).toEqual(['heading'])
  })

  it('round-trips a saved accordion back into question rows', () => {
    const accordion = faqItemsToAccordion([{
      question: 'Where can buy Asbury Seminary memorabilia?',
      answer: commencementAnswer,
      id: 'where-can-buy-asbury-seminary-memorabilia',
    }])
    const lexical = tipTapAccordionToLexical(accordion, convertAccordionChild)
    const items = lexicalAccordionToFaqItems(lexical[0])
    expect(items[0].question).toBe('Where can buy Asbury Seminary memorabilia?')
    expect(items[0].id).toBe('where-can-buy-asbury-seminary-memorabilia')
    expect(items[0].answer).toContain('https://connect.asburyseminary.edu/store')
    expect(items[0].answer).toContain('- TBD')
  })

  it('turns addresses into links and keeps bold from the answer editor', () => {
    const doc = faqAnswerDoc({
      question: 'Tickets',
      answer: 'See https://example.com/tickets for details.',
      id: 'tickets',
    })
    expect(JSON.stringify(doc)).toContain('"type":"link"')
    expect(JSON.stringify(doc)).toContain('https://example.com/tickets')

    const accordion = faqItemsToAccordion([{
      question: 'Tickets',
      answer: 'ignored plain answer',
      id: 'tickets',
      answerDoc: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'tickets', marks: [{ type: 'link', attrs: { href: 'https://example.com/tickets', target: '_blank' } }] },
          ],
        }],
      },
    }])
    expect(JSON.stringify(accordion)).toContain('"type":"bold"')
    expect(JSON.stringify(accordion)).not.toContain('ignored plain answer')

    const reopened = lexicalAccordionToFaqItems({
      type: 'accordion',
      children: [{
        type: 'accordion-item',
        itemId: 'tickets',
        children: [
          { type: 'accordion-title', children: [{ type: 'text', text: 'Tickets', format: 0 }] },
          {
            type: 'accordion-body',
            children: [{
              type: 'paragraph',
              children: [
                { type: 'text', text: 'Hello ', format: 1 },
                {
                  type: 'link',
                  fields: { url: 'https://example.com/tickets' },
                  children: [{ type: 'text', text: 'tickets', format: 0 }],
                },
              ],
            }],
          },
        ],
      }],
    })
    const saved = JSON.stringify(reopened[0].answerDoc)
    expect(saved).toContain('"type":"bold"')
    expect(saved).toContain('https://example.com/tickets')
    expect(saved).toContain('"type":"link"')
  })

  it('keeps bold, links, and lists in the answer field html', () => {
    const html = faqAnswerDocToHtml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'tickets', marks: [{ type: 'link', attrs: { href: 'https://example.com/tickets', target: '_blank' } }] },
          ],
        },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'TBD' }] }] }],
        },
      ],
    })
    expect(html).toContain('<strong>Hello </strong>')
    expect(html).toContain('<a href="https://example.com/tickets"')
    expect(html).toContain('<li>TBD</li>')

    const parsed = htmlToFaqAnswerDoc(html)
    const saved = JSON.stringify(parsed)
    expect(saved).toContain('"type":"bold"')
    expect(saved).toContain('https://example.com/tickets')
    expect(saved).toContain('bulletList')
    expect(saved).toContain('TBD')
    expect(htmlToFaqAnswerDoc('<p><a href="javascript:alert(1)">click</a></p>').content[0].content[0].marks).toBeUndefined()
  })

  it('leaves invalid JSON as text and does not consume the next block', () => {
    const nodes = [
      { id: 'faq', text: '@connect-faq [{ broken' },
      { id: 'next', text: 'See the registrar page.' },
    ]
    const out = mapLexicalChildrenWithFaq(
      nodes,
      (node) => node.text,
      (node) => [{ type: 'paragraph', attrs: { id: node.id } }],
      () => '',
    )
    expect(connectFaqMagicToAccordion(nodes[0].text)).toBeNull()
    expect(out.map((node) => node.attrs.id)).toEqual(['faq', 'next'])
  })

  it('loads in a TipTap document without being dropped', () => {
    const accordion = connectFaqMagicToAccordion(faqRaw([{
      question: 'Where can buy Asbury Seminary memorabilia?',
      answer: commencementAnswer,
      id: 'where-can-buy-asbury-seminary-memorabilia',
    }]))
    const editor = new Editor({
      element: undefined,
      extensions: [
        StarterKit.configure({ code: false, horizontalRule: false }),
        ...createConnectAccordionExtensions(),
      ],
      content: { type: 'doc', content: [accordion] },
    })
    const json = editor.getJSON()
    expect(json.content?.[0]?.type).toBe('connectAccordion')
    expect(editor.getText()).toContain('Where can buy Asbury Seminary memorabilia?')
    expect(editor.getText()).toContain('TBD')
    editor.destroy()
  })
})

function pagePlain(node: any): string | null {
  if (node.type === 'code' || node.type === 'paragraph') return typeof node.text === 'string' ? node.text : null
  return null
}

function pageConvert(node: any): any[] {
  if (node.type === 'heading') {
    return [{
      type: 'heading',
      attrs: { level: 2 },
      content: (node.children || [])
        .filter((child: any) => child?.type === 'text' && child.text)
        .map((child: any) => ({ type: 'text', text: child.text })),
    }]
  }
  if (node.type === 'paragraph' || node.type === 'code') {
    return [{ type: 'paragraph', content: [{ type: 'text', text: node.text || '' }] }]
  }
  return []
}

describe('page sections', () => {
  it('turns each heading plus FAQ into its own section and keeps the following paragraph', () => {
    const sections = lexicalChildrenToPageSections(
      [
        { type: 'heading', children: [{ type: 'text', text: 'Ceremony' }] },
        { type: 'code', text: faqRaw([{ question: 'When is the ceremony?', answer: 'Friday.', id: 'when' }]) },
        { type: 'heading', children: [{ type: 'text', text: 'Rehearsal' }] },
        { type: 'code', text: faqRaw([{ question: 'When is rehearsal?', answer: 'Thursday.', id: 'rehearsal' }]) },
        { type: 'paragraph', text: 'See the registrar for more.' },
      ],
      pagePlain,
      pageConvert,
      () => '',
    )
    expect(sections.map((section) => section.type)).toEqual(['faq', 'faq', 'content'])
    expect(sections[0]).toMatchObject({ type: 'faq', header: 'Ceremony' })
    expect(sections[1]).toMatchObject({ type: 'faq', header: 'Rehearsal' })
    if (sections[0].type !== 'faq' || sections[1].type !== 'faq' || sections[2].type !== 'content') return
    expect(sections[0].items[0].question).toBe('When is the ceremony?')
    expect(sections[1].items[0].question).toBe('When is rehearsal?')
    expect(sections[2].doc.content[0].content[0].text).toBe('See the registrar for more.')

    const saved = sectionsToTipTapDoc(sections)
    expect(saved.content.map((node: any) => node.type)).toEqual([
      'heading',
      'connectAccordion',
      'heading',
      'connectAccordion',
      'paragraph',
    ])
    expect(saved.content[0].content[0].text).toBe('Ceremony')
    expect(saved.content[2].content[0].text).toBe('Rehearsal')
  })

  it('keeps a heading with the paragraph that follows it', () => {
    const sections = lexicalChildrenToPageSections(
      [
        { type: 'heading', children: [{ type: 'text', text: 'When can I apply?' }] },
        { type: 'paragraph', text: 'Graduate students apply in the fall.' },
      ],
      pagePlain,
      pageConvert,
      () => '',
    )
    expect(sections).toHaveLength(1)
    expect(sections[0].type).toBe('content')
    if (sections[0].type !== 'content') return
    expect(sections[0].doc.content.map((node) => node.type)).toEqual(['heading', 'paragraph'])
    expect(sections[0].doc.content[0].content[0].text).toBe('When can I apply?')
  })

  it('leaves invalid FAQ JSON in the content section', () => {
    const sections = lexicalChildrenToPageSections(
      [
        { type: 'code', text: '@connect-faq [{ broken' },
        { type: 'paragraph', text: 'See the registrar page.' },
      ],
      pagePlain,
      pageConvert,
      () => '',
    )
    expect(sections).toHaveLength(1)
    expect(sections[0].type).toBe('content')
    if (sections[0].type !== 'content') return
    expect(sections[0].doc.content.map((node) => node.content[0].text)).toEqual([
      '@connect-faq [{ broken',
      'See the registrar page.',
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { lexicalToPostHtml } from '../app/utils/lexicalToPostHtml'
import {
  INITIAL_TIPTAP_DOC,
  lexicalToTipTap,
  tipTapDocHasMeaningfulText,
  tipTapToLexical,
} from '../app/utils/tiptap/lexicalTipTap'

function lexicalDoc(children: any[]) {
  return {
    root: {
      type: 'root',
      version: 1,
      children,
    },
  }
}

describe('lexical ↔ tip tap for posts', () => {
  it('starts from an empty paragraph', () => {
    expect(INITIAL_TIPTAP_DOC.content[0].type).toBe('paragraph')
    expect(tipTapDocHasMeaningfulText(INITIAL_TIPTAP_DOC)).toBe(false)
  })

  it('round-trips bold text, heading, and a list', () => {
    const lexical = lexicalDoc([
      {
        type: 'heading',
        tag: 'h2',
        children: [{ type: 'text', text: 'Chapel', format: 0, version: 1 }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Join us', format: 1, version: 1 }],
      },
      {
        type: 'list',
        listType: 'bullet',
        children: [{
          type: 'listitem',
          children: [{ type: 'text', text: 'Bring a friend', format: 0, version: 1 }],
        }],
      },
    ])

    const tipTap = lexicalToTipTap(lexical)
    expect(tipTap.content[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } })
    expect(tipTap.content[1].content[0].marks).toEqual([{ type: 'bold' }])
    expect(tipTap.content[2].type).toBe('bulletList')
    expect(tipTapDocHasMeaningfulText(tipTap)).toBe(true)

    const back = tipTapToLexical(tipTap)
    expect(back.root.children[0].type).toBe('heading')
    expect(back.root.children[0].tag).toBe('h2')
    expect(back.root.children[1].children[0].format).toBe(1)
    expect(back.root.children[2].type).toBe('list')
    expect(back.root.children[2].listType).toBe('bullet')
  })

  it('splits multiline lexical text into hard breaks', () => {
    const lexical = lexicalDoc([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Hello\nworld', format: 0, version: 1 }],
      },
    ])
    const tipTap = lexicalToTipTap(lexical)
    expect(tipTap.content[0].content).toEqual([
      { type: 'text', text: 'Hello' },
      { type: 'hardBreak' },
      { type: 'text', text: 'world' },
    ])
  })

  it('round-trips links and blockquotes', () => {
    const lexical = lexicalDoc([
      {
        type: 'quote',
        children: [{
          type: 'paragraph',
          children: [{
            type: 'link',
            fields: { url: 'https://asburyseminary.edu', newTab: true },
            children: [{ type: 'text', text: 'Asbury', format: 0, version: 1 }],
          }],
        }],
      },
    ])
    const tipTap = lexicalToTipTap(lexical)
    expect(tipTap.content[0].type).toBe('blockquote')
    expect(tipTap.content[0].content[0].content[0].marks).toEqual(
      expect.arrayContaining([{ type: 'link', attrs: { href: 'https://asburyseminary.edu', target: '_blank' } }]),
    )
    const back = tipTapToLexical(tipTap)
    expect(back.root.children[0].type).toBe('quote')
    expect(back.root.children[0].children[0].children[0].type).toBe('link')
    expect(back.root.children[0].children[0].children[0].fields.url).toBe('https://asburyseminary.edu')
  })
})

describe('lexicalToPostHtml', () => {
  it('renders marks, lists, and headings', () => {
    const html = lexicalToPostHtml(lexicalDoc([
      {
        type: 'heading',
        tag: 'h2',
        children: [{ type: 'text', text: 'Notice', format: 0, version: 1 }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Please read', format: 1, version: 1 }],
      },
      {
        type: 'list',
        listType: 'number',
        children: [{
          type: 'listitem',
          children: [{ type: 'text', text: 'Item one', format: 0, version: 1 }],
        }],
      },
    ]))
    expect(html).toContain('<h2>Notice</h2>')
    expect(html).toContain('<strong>Please read</strong>')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>Item one</li>')
  })

  it('linkifies raw urls and skips youtube autolinks', () => {
    const html = lexicalToPostHtml(lexicalDoc([
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'See https://example.com/path?a=1', format: 0, version: 1 },
          { type: 'autolink', fields: { url: 'https://www.youtube.com/watch?v=abc' }, children: [] },
        ],
      },
    ]))
    expect(html).toContain('href="https://example.com/path?a=1"')
    expect(html).not.toContain('youtube.com')
  })
})

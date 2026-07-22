import { describe, expect, it } from 'vitest'
import {
  createEmptyAccordionJson,
  lexicalAccordionToTipTap,
  tipTapAccordionToLexical,
} from '../app/utils/tiptap/connectAccordionExtension'

describe('connect accordion tip tap ↔ lexical', () => {
  it('creates a tip tap accordion stub', () => {
    const json = createEmptyAccordionJson()
    expect(json.type).toBe('connectAccordion')
    expect(json.content[0].type).toBe('connectAccordionItem')
    expect(json.content[0].content[0].type).toBe('connectAccordionItemTitle')
    expect(json.content[0].content[1].type).toBe('connectAccordionItemBody')
  })

  it('round-trips title + body paragraph', () => {
    const tipTapIdentity = (n: any) => {
      if (!n) return []
      if (n.type === 'text') {
        return [{
          mode: 'normal',
          text: n.text || '',
          type: 'text',
          style: '',
          detail: 0,
          format: 0,
          version: 1,
        }]
      }
      if (n.type === 'paragraph') {
        return [{
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: (n.content || []).flatMap(tipTapIdentity),
          direction: null,
          textStyle: '',
          textFormat: 0,
        }]
      }
      if (Array.isArray(n.content)) return n.content.flatMap(tipTapIdentity)
      return []
    }

    const tipTap = createEmptyAccordionJson()
    tipTap.content[0].content[0].content = [{ type: 'text', text: 'What is Connect?' }]
    tipTap.content[0].content[1].content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'An internal portal.' }],
      },
    ]
    tipTap.content[0].attrs = { itemId: 'what' }

    const lexicalNodes = tipTapAccordionToLexical(tipTap, tipTapIdentity)
    expect(lexicalNodes).toHaveLength(1)
    expect(lexicalNodes[0].type).toBe('accordion')
    expect(lexicalNodes[0].children[0].itemId).toBe('what')
    expect(lexicalNodes[0].children[0].children[0].type).toBe('accordion-title')
    expect(lexicalNodes[0].children[0].children[1].type).toBe('accordion-body')

    const lexicalToTipTapText = (n: any) => {
      if (!n) return []
      if (n.type === 'text') return [{ type: 'text', text: n.text || '' }]
      if (n.type === 'paragraph') {
        return [{ type: 'paragraph', content: (n.children || []).flatMap(lexicalToTipTapText) }]
      }
      if (Array.isArray(n.children)) return n.children.flatMap(lexicalToTipTapText)
      return []
    }

    const back = lexicalAccordionToTipTap(lexicalNodes[0], lexicalToTipTapText)
    expect(back[0].type).toBe('connectAccordion')
    expect(back[0].content[0].attrs.itemId).toBe('what')
    expect(back[0].content[0].content[0].content[0].text).toBe('What is Connect?')
    expect(back[0].content[0].content[1].content[0].content[0].text).toBe('An internal portal.')
  })
})

/**
 * TipTap Node definitions for Connect accordion.
 * Import this only when registering with UEditor, and ensure Vite resolves a single
 * @tiptap/core + prosemirror-state (see nuxt.config vite.resolve.alias).
 */
import { mergeAttributes, Node } from '@tiptap/core'
import { createEmptyAccordionItemJson } from './connectAccordionExtension'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    connectAccordion: {
      insertConnectAccordion: () => ReturnType
      addConnectAccordionItem: () => ReturnType
    }
  }
}

export const ConnectAccordion = Node.create({
  name: 'connectAccordion',
  group: 'block',
  content: 'connectAccordionItem+',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-connect-accordion]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-connect-accordion': '',
        class: 'connect-accordion not-prose my-4 space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 p-2',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      insertConnectAccordion:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: [createEmptyAccordionItemJson()],
          }),
      addConnectAccordionItem:
        () =>
        ({ state, dispatch, tr }) => {
          const { $from } = state.selection
          let itemDepth = -1
          let accordionDepth = -1
          for (let d = $from.depth; d > 0; d--) {
            const name = $from.node(d).type.name
            if (itemDepth < 0 && name === 'connectAccordionItem') itemDepth = d
            if (name === 'connectAccordion') {
              accordionDepth = d
              break
            }
          }
          if (accordionDepth < 0) return false
          const insertPos = itemDepth > 0 ? $from.after(itemDepth) : $from.after(accordionDepth)
          const itemType = state.schema.nodes.connectAccordionItem
          const itemNode = itemType?.createAndFill()
          if (!itemNode || !dispatch) return false
          dispatch(tr.insert(insertPos, itemNode).scrollIntoView())
          return true
        },
    }
  },
})

export const ConnectAccordionItem = Node.create({
  name: 'connectAccordionItem',
  content: 'connectAccordionItemTitle connectAccordionItemBody',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      itemId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-item-id') || '',
        renderHTML: (attrs) => (attrs.itemId ? { 'data-item-id': attrs.itemId } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-connect-accordion-item]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-connect-accordion-item': '',
        class: 'connect-accordion-item rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden',
      }),
      0,
    ]
  },
})

export const ConnectAccordionItemTitle = Node.create({
  name: 'connectAccordionItemTitle',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-connect-accordion-title]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-connect-accordion-title': '',
        class:
          'connect-accordion-item-title px-3 py-2 text-sm font-semibold text-gray-900 border-b border-gray-100 bg-gray-50',
      }),
      0,
    ]
  },
})

export const ConnectAccordionItemBody = Node.create({
  name: 'connectAccordionItemBody',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-connect-accordion-body]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-connect-accordion-body': '',
        class: 'connect-accordion-item-body px-3 py-2 text-sm text-gray-800',
      }),
      0,
    ]
  },
})

export function createConnectAccordionExtensions() {
  return [
    ConnectAccordion,
    ConnectAccordionItem,
    ConnectAccordionItemTitle,
    ConnectAccordionItemBody,
  ]
}

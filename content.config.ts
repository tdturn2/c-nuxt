import { defineCollection, defineContentConfig } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    /** Markdown pages in project `content/` (pattern is relative to that folder) */
    content: defineCollection({
      type: 'page',
      source: '**/*.md'
    })
  }
})

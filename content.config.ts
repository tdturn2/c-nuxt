import { defineCollection, defineContentConfig } from '@nuxt/content'

/** Required so Nuxt UI ContentSearch components are enabled; Connect search index comes from Payload pages. */
export default defineContentConfig({
  collections: {
    /** Dummy collection: we use Payload for Connect content; this enables config detection. */
    content: defineCollection({
      type: 'page',
      source: '**',
    }),
  },
})

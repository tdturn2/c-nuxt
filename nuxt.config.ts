// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/content'],
  ssr: false, // SPA mode - no SSR needed for intranet
  runtimeConfig: {
    payloadApiUrl: process.env.PAYLOAD_API_URL || 'http://localhost:3002/api/connect-posts',
    payloadBaseUrl: process.env.PAYLOAD_BASE_URL || 'http://localhost:3002',
    public: {
      payloadBaseUrl: process.env.PAYLOAD_BASE_URL || 'http://localhost:3002',
      payloadApiUrl: process.env.PAYLOAD_API_URL || 'http://localhost:3002/api/connect-posts'
    }
  }
})

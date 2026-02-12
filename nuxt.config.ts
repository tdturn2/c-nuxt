// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/content', '@sidebase/nuxt-auth'],
  ssr: false, // SPA mode - no SSR needed for intranet
  auth: {
    provider: {
      type: 'authjs'
    },
    baseURL: process.env.AUTH_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    globalAppMiddleware: true // Protect all routes by default - requires authentication
  },
  runtimeConfig: {
    // Private keys (only available on server-side)
    authSecret: process.env.AUTH_SECRET,
    azureAdClientId: process.env.AUTH_AZURE_AD_CLIENT_ID,
    azureAdClientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET,
    azureAdTenantId: process.env.AUTH_AZURE_AD_TENANT_ID,
    // Public keys (exposed to client-side)
    public: {
      authAzureAdClientId: process.env.AUTH_AZURE_AD_CLIENT_ID,
      authAzureAdTenantId: process.env.AUTH_AZURE_AD_TENANT_ID,
      payloadBaseUrl: process.env.PAYLOAD_BASE_URL || 'http://localhost:3002',
      payloadApiUrl: process.env.PAYLOAD_API_URL || 'http://localhost:3002/api/connect-posts'
    },
    // Legacy PayloadCMS config
    payloadApiUrl: process.env.PAYLOAD_API_URL || 'http://localhost:3002/api/connect-posts',
    payloadBaseUrl: process.env.PAYLOAD_BASE_URL || 'http://localhost:3002'
  }
})
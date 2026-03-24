// https://nuxt.com/docs/api/configuration/nuxt-config
// Auth public URL — sidebase reads NUXT_PUBLIC_AUTH_BASE_URL / AUTH_ORIGIN first, NOT AUTH_URL.
// https://auth.sidebase.io/guide/advanced/url-resolutions
// Set one of these in Vercel (Production + Preview if you use previews), e.g. https://your-app.vercel.app/api/auth
const authBaseUrl =
  process.env.NUXT_PUBLIC_AUTH_BASE_URL ||
  process.env.AUTH_ORIGIN ||
  process.env.AUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/auth` : undefined)
const nitroPreset = process.env.VERCEL ? 'vercel' : undefined

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@nuxt/ui', '@nuxt/content', '@sidebase/nuxt-auth'],
  ssr: false, // SPA mode - no SSR needed for intranet
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },
  // Rollup warns when any chunk > 500 kB; Vercel logs often show `[warn]` with the message on the next lines (looks "empty").
  vite: {
    build: {
      chunkSizeWarningLimit: 900
    }
  },
  nitro: {
    // Force Vercel-optimized output during Vercel builds to avoid slow node-server packaging.
    ...(nitroPreset ? { preset: nitroPreset } : {}),
    // Ensure API routes work in SPA mode
    experimental: {
      wasm: true
    },
    // Ensure API routes are not intercepted by the router
    routeRules: {
      '/api/**': { cors: true, headers: { 'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE' } }
    }
  },
  auth: {
    provider: {
      type: 'authjs'
    },
    baseURL: authBaseUrl,
    globalAppMiddleware: {
      isEnabled: true, 
      addDefaultCallbackUrl: true
    },
    // Ensure API routes work in SPA mode
    disableServerSideAuth: false,
    disableInternalRouting: false,
    // Session refresh configuration
    sessionRefresh: {
      enablePeriodically: false,
      enableOnWindowFocus: true
    }
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
      payloadBaseUrl: process.env.PAYLOAD_BASE_URL,
      payloadApiUrl: process.env.PAYLOAD_API_URL || `${process.env.PAYLOAD_BASE_URL}/api/connect-posts`,
      // Podcast feed configuration
      podcasts: [
        {
          id: 'wesworld',
          name: 'WesWorld',
          rssUrl: process.env.WESWORLD_RSS_URL || 'https://feed.podbean.com/wesworld/feed.xml',
          artwork: '/estes-icon.png'
        },
        {
          id: 'chapel',
          name: 'Asbury Seminary Chapel',
          rssUrl: 'https://asburyseminary.edu/podcasts/chapel-ky-audio.php',
          artwork: '/estes-icon.png'
        },
        {
          id: 'elementary',
          name: 'It\'s Elementary',
          rssUrl: 'https://feed.podbean.com/itselementary/feed.xml',
          artwork: '/estes-icon.png'
        },
      ]
    },
    // Legacy PayloadCMS config
    payloadApiUrl: process.env.PAYLOAD_API_URL
      ? `${process.env.PAYLOAD_API_URL}/api/connect-posts`
      : undefined,
    payloadBaseUrl: process.env.PAYLOAD_BASE_URL
  }
})
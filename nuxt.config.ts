// https://nuxt.com/docs/api/configuration/nuxt-config
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDir = dirname(fileURLToPath(import.meta.url))

// Auth public URL — sidebase reads NUXT_PUBLIC_AUTH_BASE_URL / AUTH_ORIGIN first, NOT AUTH_URL.
// https://auth.sidebase.io/guide/advanced/url-resolutions
// Set one of these in Vercel (Production + Preview if you use previews), e.g. https://your-app.vercel.app/api/auth
const authBaseUrl =
  process.env.NUXT_PUBLIC_AUTH_BASE_URL ||
  process.env.AUTH_ORIGIN ||
  process.env.AUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/auth` : undefined)
const nitroPreset = process.env.VERCEL ? 'vercel' : undefined
const devAuthBaseUrl = process.env.NODE_ENV !== 'production' ? '/api/auth' : undefined

function hostnameFromEnvUrl(raw: string | undefined): string | undefined {
  const t = (raw || '').trim()
  if (!t) return undefined
  try {
    return new URL(t).hostname
  } catch {
    return undefined
  }
}

/** Hostnames allowed for @nuxt/image / IPX (Payload media, S3, etc.). */
const nuxtImageDomains = [
  ...new Set(
    [
      hostnameFromEnvUrl(process.env.NUXT_PUBLIC_PAYLOAD_BASE_URL),
      hostnameFromEnvUrl(process.env.PAYLOAD_BASE_URL),
      ...((process.env.NUXT_PUBLIC_IMAGE_DOMAINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)),
      'localhost',
      '127.0.0.1',
      's3.amazonaws.com',
      'storage.googleapis.com',
    ].filter(Boolean) as string[],
  ),
]

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  sourcemap: false,
  alias: {
    '@shared': join(projectDir, 'shared'),
  },
  modules: ['@nuxt/ui', '@nuxt/image', '@sidebase/nuxt-auth'],
  image: {
    domains: nuxtImageDomains,
    format: ['webp'],
  },
  ssr: false, // SPA mode - no SSR needed for intranet
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },
  // Rollup warns when any chunk > 500 kB; Vercel logs often show `[warn]` with the message on the next lines (looks "empty").
  vite: {
    /** One physical copy of TipTap / PM — avoids "Adding different instances of a keyed plugin" when Nuxt UI and the app resolve different node_modules trees. */
    resolve: {
      dedupe: [
        '@tiptap/core',
        '@tiptap/pm',
        '@tiptap/vue-3',
        '@tiptap/starter-kit',
        '@tiptap/extension-image',
        '@tiptap/extension-mention',
        '@tiptap/extension-code',
        '@tiptap/extension-horizontal-rule',
        '@tiptap/extension-placeholder',
        'prosemirror-state',
        'prosemirror-view',
        'prosemirror-model',
        'prosemirror-transform',
        'prosemirror-keymap',
        'prosemirror-history',
        'prosemirror-commands',
        'prosemirror-dropcursor',
        'prosemirror-gapcursor',
        'prosemirror-schema-list',
      ],
    },
    server: {
      // macOS often has low default file-watch limits; aggressively ignore large folders.
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**', '**/.nuxt/**', '**/.output/**']
      }
    },
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
    // In dev, Nuxt may shift ports (e.g. 3000 -> 3001). A relative baseURL avoids mismatches.
    baseURL: authBaseUrl ?? devAuthBaseUrl,
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
    azureAdMobileClientId: process.env.AUTH_AZURE_AD_MOBILE_CLIENT_ID,
    azureAdClientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET,
    azureAdTenantId: process.env.AUTH_AZURE_AD_TENANT_ID,
    mobileAuthJwtSecret: process.env.MOBILE_AUTH_JWT_SECRET,
    instructureBaseUrl: process.env.INSTRUCTURE_BASE_URL,
    instructureApiId: process.env.INSTRUCTURE_API_ID,
    instructureApiKey: process.env.INSTRUCTURE_API_KEY,
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
    payloadBaseUrl: process.env.PAYLOAD_BASE_URL,
    /** Optional. Payload JWT (e.g. admin or API user) for server-side REST when student session returns 403. */
    payloadServerBearer: process.env.PAYLOAD_SERVER_BEARER,
    /**
     * Optional. Payload custom POST path (no leading slash), e.g. student-degree-plans/create-from-connect
     * Body: { email, degree, specialization?, status, startDate, expectedGraduation } — implement in Payload with email verified against session.
     */
    payloadStudentDegreePlanSsoPath: process.env.PAYLOAD_STUDENT_DEGREE_PLAN_SSO_PATH,
    // Path segments before :id for dashboard SSO update (default matches POST /api/connect-pages/update/:id)
    payloadConnectPagesUpdatePath:
      process.env.PAYLOAD_CONNECT_PAGES_UPDATE_PATH || 'connect-pages/update',
  }
})
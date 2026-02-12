import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  secret: useRuntimeConfig().authSecret,
  debug: true, // Enable debug logging
  callbacks: {
    async redirect({ url, baseUrl }) {
      // If no callback URL, go to home
      if (!url || url === baseUrl) return baseUrl
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) return url
      } catch {
        // Invalid URL, return baseUrl
      }
      return baseUrl
    },
    async signIn({ user, account, profile }) {
      // Log for debugging
      console.log('Sign in callback:', { user, account: account?.provider, profile })
      return true
    },
    async jwt({ token, account, profile }) {
      // Log for debugging
      if (account) {
        console.log('JWT callback with account:', account.provider)
        token.accessToken = account.access_token
        token.idToken = account.id_token
      }
      return token
    },
    async session({ session, token }) {
      // Log for debugging
      console.log('Session callback:', { session, token })
      return session
    }
  },
  providers: [
    {
      id: 'azure-ad',
      name: 'Microsoft Entra',
      type: 'oauth',
      wellKnown: `https://login.microsoftonline.com/${useRuntimeConfig().azureAdTenantId}/v2.0/.well-known/openid-configuration`,
      authorization: {
        params: {
          scope: 'openid profile email',
          response_type: 'code',
          response_mode: 'query'
        }
      },
      clientId: useRuntimeConfig().azureAdClientId,
      clientSecret: useRuntimeConfig().azureAdClientSecret,
      // Azure AD Web apps require client_secret for server-side token exchange
      // PKCE can still be used for additional security
      idToken: true,
      checks: ['pkce', 'state'],
      profile(profile: any) {
        return {
          id: profile.sub || profile.oid,
          name: profile.name,
          email: profile.email || profile.preferred_username,
          image: profile.picture
        }
      }
    }
  ]
}, useRuntimeConfig())

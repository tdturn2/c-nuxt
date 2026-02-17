import { NuxtAuthHandler } from '#auth'
import { syncUserToPayload } from '../../utils/syncUser'

export default NuxtAuthHandler({
  secret: useRuntimeConfig().authSecret,
  // Configure pages to use API routes, not custom pages
  pages: {
    signIn: '/signin',
    error: '/signin'
  },
  // Session configuration for SPA mode
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false // Set to true in production via environment variable if needed
      }
    }
  },
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
      return true
    },
    async jwt({ token, account, profile, user }) {
      // Extract groups from profile if available
      let groups: string[] | null = null
      if (profile) {
        const profileAny = profile as any
        
        // Log all profile keys to see what's available
        console.log('[Auth] Profile keys:', Object.keys(profileAny))
        console.log('[Auth] Profile data:', JSON.stringify(profileAny, null, 2))
        
        // Check for groups in various formats
        if (profileAny.groups) {
          groups = Array.isArray(profileAny.groups) ? profileAny.groups : [profileAny.groups]
          console.log('[Auth] Found groups in profile.groups:', groups)
          token.groups = groups
        }
        if (profileAny.memberOf) {
          groups = Array.isArray(profileAny.memberOf) ? profileAny.memberOf : [profileAny.memberOf]
          console.log('[Auth] Found groups in profile.memberOf:', groups)
          token.groups = groups
        }
        
        // Check for sAMAccountName and related group fields
        if (profileAny.sAMAccountName) {
          console.log('[Auth] Found sAMAccountName:', profileAny.sAMAccountName)
        }
        
        // Check for groups passed via sAMAccountName or other Azure AD specific fields
        if (profileAny['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']) {
          const claimGroups = profileAny['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']
          groups = Array.isArray(claimGroups) ? claimGroups : [claimGroups]
          console.log('[Auth] Found groups in claims/groups:', groups)
          token.groups = groups
        }
        
        // Log final groups value
        if (groups) {
          console.log('[Auth] Final groups extracted:', groups)
        } else {
          console.log('[Auth] No groups found in profile')
        }
      }
      
      // Store user info in token (this is essential)
      if (user) {
        token.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image
        }
        
        // Sync user to PayloadCMS (only on first sign-in when account is present)
        if (account && user.id && user.email) {
          console.log(`[Auth] Syncing user to PayloadCMS: ${user.email}`)
          await syncUserToPayload({
            id: user.id,
            name: user.name || null,
            email: user.email || null,
            image: user.image || null,
            groups: groups || null
          })
        }
      }
      
      return token
    },
    async session({ session, token }) {
      // CRITICAL: Always populate user from token if available
      if (token.user) {
        const tokenUser = token.user as any
        const sessionAny = session as any
        sessionAny.user = {
          id: tokenUser.id,
          name: tokenUser.name,
          email: tokenUser.email,
          image: tokenUser.image
        }
        session.user = {
          name: tokenUser.name || null,
          email: tokenUser.email || null,
          image: tokenUser.image || null
        }
      }
      
      // Include groups in session if available
      const tokenAny = token as any
      if (tokenAny.groups) {
        (session as any).groups = tokenAny.groups
      }
      
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
          scope: 'openid profile email GroupMember.Read.All',
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
        // Log profile in profile callback to see what Azure AD sends
        console.log('[Auth] Profile callback - Full profile:', JSON.stringify(profile, null, 2))
        console.log('[Auth] Profile callback - sAMAccountName:', profile.sAMAccountName)
        console.log('[Auth] Profile callback - groups:', profile.groups)
        console.log('[Auth] Profile callback - memberOf:', profile.memberOf)
        
        // Extract groups from various possible locations
        let groups = profile.groups || profile.memberOf
        if (!groups && profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']) {
          groups = profile['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']
        }
        
        return {
          id: profile.sub || profile.oid,
          name: profile.name,
          email: profile.email || profile.preferred_username,
          image: profile.picture,
          // Include groups if present - pass through all profile data for jwt callback
          groups: groups,
          sAMAccountName: profile.sAMAccountName,
          // Pass through entire profile for jwt callback to access all fields
          _raw: profile
        }
      }
    }
  ]
})

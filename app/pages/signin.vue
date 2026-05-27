<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Sign In</h1>
      <div
        v-if="authError"
        class="mb-6 max-w-md mx-auto rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-900"
      >
        <p class="font-semibold">Sign-in failed</p>
        <p class="mt-1">{{ authError }}</p>
      </div>
      <p class="mb-6" v-if="isRedirecting">Redirecting to Microsoft Entra...</p>
      <p class="mb-6" v-else>Click the button below to sign in with Microsoft Entra</p>
      <form 
        ref="signInForm"
        method="POST" 
        action="/api/auth/signin/azure-ad"
      >
        <input type="hidden" name="callbackUrl" :value="callbackUrl" />
        <input type="hidden" name="csrfToken" :value="csrfToken" />
        <input type="hidden" name="redirect" value="true" />
        <UButton 
          type="submit"
          color="primary"
          size="lg"
          :disabled="isRedirecting"
          @click.prevent="handleSignIn"
        >
          Sign in with Microsoft Entra
        </UButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
// Exclude this page from auth protection
definePageMeta({
  auth: false
})

const { status, signIn: authSignIn, getCsrfToken } = useAuth()
const route = useRoute()
const isRedirecting = ref(false)
const signInForm = ref<HTMLFormElement | null>(null)
const csrfToken = ref<string>('')
const authErrorMessages: Record<string, string> = {
  Configuration: 'Auth is misconfigured on the server (check AUTH base URL and secrets).',
  AccessDenied: 'Access was denied. Your account may not be allowed to use this app.',
  Verification: 'The sign-in link is no longer valid. Try again.',
  OAuthSignin: 'Could not start Microsoft sign-in. Try again.',
  OAuthCallback:
    'Microsoft accepted your login, but Connect could not finish sign-in. The usual cause is an expired AUTH_AZURE_AD_CLIENT_SECRET — create a new client secret in Entra and update connect/.env (and Vercel).',
  OAuthCreateAccount: 'Could not create your account after sign-in.',
  EmailCreateAccount: 'Could not create your account.',
  Callback: 'Sign-in callback failed. Try again.',
  OAuthAccountNotLinked: 'This Microsoft account is not linked to an existing user.',
  SessionRequired: 'Please sign in to continue.',
  Default: 'Sign-in failed. Try again or contact support.',
}

const authError = computed(() => {
  const raw = route.query.error
  const code = Array.isArray(raw) ? raw[0] : raw
  if (!code || typeof code !== 'string') return ''
  return authErrorMessages[code] || authErrorMessages.Default
})

const callbackUrl = computed(() => {
  const raw = route.query.callbackUrl
  const value = Array.isArray(raw) ? raw[0] : raw
  const fallback = '/'
  if (!value || typeof value !== 'string') return fallback
  // Keep redirects on-origin only and preserve deep links.
  if (value.startsWith('/')) return value
  try {
    const parsed = new URL(value, window.location.origin)
    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // fall through
  }
  return fallback
})

// Get CSRF token on mount
onMounted(async () => {
  await fetchCsrfToken()
  
  // Check if already authenticated AFTER mount
  if (status.value === 'authenticated') {
    navigateTo(callbackUrl.value || '/')
  }
})

const fetchCsrfToken = async () => {
  try {
    // Try using the useAuth method first
    const token = await getCsrfToken()
    if (token) {
      csrfToken.value = token
      return
    }
    
    // Fallback: fetch directly from the API
    console.log('Fetching CSRF token from API...')
    const response = await fetch('/api/auth/csrf')
    const data = await response.json()
    if (data.csrfToken) {
      csrfToken.value = data.csrfToken
      console.log('CSRF token fetched from API:', !!csrfToken.value)
    } else {
      console.error('No CSRF token in response:', data)
    }
  } catch (error) {
    console.error('Error getting CSRF token:', error)
  }
}

const handleSignIn = async (e: MouseEvent) => {
  e.preventDefault()
  console.log('Sign in button clicked, csrfToken:', !!csrfToken.value)
  
  if (isRedirecting.value) {
    return
  }
  
  isRedirecting.value = true
  
  // Always ensure CSRF token is set before submission
  if (!csrfToken.value) {
    console.log('CSRF token missing, fetching...')
    await fetchCsrfToken()
    if (!csrfToken.value) {
      console.error('Failed to fetch CSRF token')
      isRedirecting.value = false
      return
    }
  }
  
  if (csrfToken.value && signInForm.value) {
    // Update the CSRF token in the form
    const csrfInput = signInForm.value.querySelector('input[name="csrfToken"]') as HTMLInputElement
    if (csrfInput) {
      csrfInput.value = csrfToken.value
    }
    
    // Submit the form
    console.log('Submitting form to:', signInForm.value.action)
    signInForm.value.submit()
  } else {
    console.error('CSRF token missing or form not found')
    isRedirecting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
    <div class="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg">
      <div class="flex justify-center bg-gradient-to-r from-[rgba(13,94,130,1)] to-[rgba(10,69,92,1)] px-8 py-9">
        <img :src="connectLogoWide" alt="Asbury Connect" class="h-10 w-auto sm:h-11" />
      </div>

      <div class="px-8 py-8 text-center">
        <p v-if="isRedirecting" class="text-sm text-gray-600">
          Redirecting to Microsoft…
        </p>
        <p v-else class="text-base text-gray-700">
          Sign in with your Asbury Seminary Single Sign-On (SSO) account to continue.
        </p>

        <div
          v-if="authError"
          class="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-900"
        >
          <p class="font-semibold">Sign-in failed</p>
          <p class="mt-1">{{ authError }}</p>
        </div>

        <form
          ref="signInForm"
          class="mt-6"
          method="POST"
          action="/api/auth/signin/azure-ad"
        >
          <input type="hidden" name="callbackUrl" :value="callbackUrl" />
          <input type="hidden" name="csrfToken" :value="csrfToken" />
          <input type="hidden" name="redirect" value="true" />
          <button
            type="submit"
            class="inline-flex w-full items-center justify-center gap-2.5 rounded-md bg-[rgba(13,94,130,1)] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[rgba(10,69,92,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,94,130,0.45)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isRedirecting"
            @click.prevent="handleSignIn"
          >
            <img src="/shield.svg" alt="" aria-hidden="true" class="h-5 w-auto shrink-0" />
            Sign in
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import connectLogoWide from '../../assets/connect-logo.svg'

definePageMeta({
  auth: false,
})

useHead({
  title: 'Sign In — Asbury Connect',
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

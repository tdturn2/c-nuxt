<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Sign In</h1>
      <p class="mb-6" v-if="isRedirecting">Redirecting to Microsoft Entra...</p>
      <p class="mb-6" v-else>Click the button below to sign in with Microsoft Entra</p>
      <form 
        ref="signInForm"
        method="POST" 
        action="/api/auth/signin/azure-ad"
        style="display: none;"
      >
        <input type="hidden" name="callbackUrl" value="/" />
        <input type="hidden" name="csrfToken" :value="csrfToken" />
        <input type="hidden" name="redirect" value="true" />
      </form>
      <UButton 
        @click="handleSignIn"
        color="primary"
        size="lg"
        :disabled="isRedirecting"
      >
        Sign in with Microsoft Entra
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// Exclude this page from auth protection
definePageMeta({
  auth: false
})

const { status, signIn: authSignIn, getCsrfToken } = useAuth()
const isRedirecting = ref(false)
const signInForm = ref<HTMLFormElement | null>(null)
const csrfToken = ref<string>('')

// Get CSRF token on mount
onMounted(async () => {
  try {
    csrfToken.value = await getCsrfToken() || ''
  } catch (error) {
    console.error('Error getting CSRF token:', error)
  }
})

const handleSignIn = () => {
  if (isRedirecting.value) return
  isRedirecting.value = true
  
  // Submit the form directly - this should trigger the OAuth redirect via POST
  if (signInForm.value) {
    signInForm.value.submit()
  } else {
    // Fallback: create and submit form programmatically
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/signin/azure-ad'
    
    const callbackInput = document.createElement('input')
    callbackInput.type = 'hidden'
    callbackInput.name = 'callbackUrl'
    callbackInput.value = '/'
    form.appendChild(callbackInput)
    
    if (csrfToken.value) {
      const csrfInput = document.createElement('input')
      csrfInput.type = 'hidden'
      csrfInput.name = 'csrfToken'
      csrfInput.value = csrfToken.value
      form.appendChild(csrfInput)
    }
    
    document.body.appendChild(form)
    form.submit()
  }
}

// Check if already authenticated
watch(status, (newStatus) => {
  if (newStatus === 'authenticated') {
    navigateTo('/')
  }
}, { immediate: true })
</script>

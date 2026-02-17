// Composable to get the current authenticated user's PayloadCMS ID
export const useCurrentUser = () => {
  const { data: session, status } = useAuth()
  const currentPayloadUserId = ref<number | undefined>(undefined)
  const loading = ref(false)

  // Get PayloadCMS user ID by looking up the user by email
  const getPayloadUserId = async (email: string | null | undefined): Promise<number | undefined> => {
    if (!email) return undefined
    
    try {
      // Query PayloadCMS for user by email
      const response = await $fetch(`/api/users/by-email`, {
        query: { email },
        credentials: 'include'
      }) as { id: number } | null
      
      return response?.id
    } catch (error) {
      console.error('Error fetching PayloadCMS user ID:', error)
      return undefined
    }
  }

  // Initialize current user ID
  const initialize = async () => {
    if (status.value !== 'authenticated' || !session.value?.user?.email) {
      currentPayloadUserId.value = undefined
      return
    }

    if (currentPayloadUserId.value) {
      return // Already loaded
    }

    loading.value = true
    try {
      const userId = await getPayloadUserId(session.value.user.email)
      currentPayloadUserId.value = userId
    } catch (error) {
      console.error('Error initializing current user:', error)
    } finally {
      loading.value = false
    }
  }

  // Watch for auth status changes
  watch([status, () => session.value?.user?.email], () => {
    if (status.value === 'authenticated') {
      initialize()
    } else {
      currentPayloadUserId.value = undefined
    }
  }, { immediate: true })

  return {
    currentPayloadUserId: readonly(currentPayloadUserId),
    loading: readonly(loading),
    refresh: initialize
  }
}

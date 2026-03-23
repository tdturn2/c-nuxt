// Current user from session (Entra). Fetches full user via GET /api/users/me.
export const useMe = () => {
  const { status } = useAuth()
  const user = ref<{ id: number; name?: string; email?: string; avatar?: { url: string } | null; [key: string]: any } | null>(null)
  const loading = ref(false)

  const refresh = async () => {
    loading.value = true
    try {
      const data = await $fetch('/api/users/me', { credentials: 'include' })
      user.value = data as typeof user.value
    } catch {
      user.value = null
    } finally {
      loading.value = false
    }
  }

  watch(status, () => {
    refresh()
  }, { immediate: true })

  const currentUserId = computed(() => user.value?.id)

  return {
    user: readonly(user),
    loading: readonly(loading),
    currentUserId,
    refresh
  }
}

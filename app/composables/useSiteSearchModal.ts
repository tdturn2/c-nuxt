import { createSharedComposable } from '@vueuse/core'

export const useSiteSearchModal = createSharedComposable(() => {
  const open = ref(false)
  const searchTerm = ref('')
  return { open, searchTerm }
})


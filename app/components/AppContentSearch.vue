<template>
  <ClientOnly>
    <LazyUContentSearch
      v-model:search-term="searchTerm"
      :files="files"
      :navigation="navigation"
      :links="links"
      :groups="extraGroups"
      :loading="loading"
      :color-mode="false"
      shortcut="meta_k"
      placeholder="Search departments, resources, and people…"
      :fuse="{
        fuseOptions: {
          ignoreLocation: true,
          threshold: 0.2,
          keys: ['label', 'suffix', 'description'],
        },
        resultLimit: 40,
      }"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
const { data: session } = useAuth()
const isSignedIn = computed(() => Boolean(session.value?.user?.email))

const {
  files,
  navigation,
  links,
  extraGroups,
  loading,
  loadIndex,
  searchTerm,
} = useSiteSearch()

const { open } = useContentSearch()

watch(isSignedIn, (signedIn) => {
  if (signedIn) loadIndex()
}, { immediate: true })

watch(open, (isOpen) => {
  if (isOpen && isSignedIn.value) loadIndex()
})
</script>

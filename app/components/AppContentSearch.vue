<template>
  <ClientOnly>
    <UModal
      v-model:open="open"
      title="Search"
      description="Search departments, resources, and people."
      :portal="true"
      :overlay="true"
      :ui="{ content: 'sm:max-w-3xl h-full sm:h-[28rem]' }"
    >
      <template #content>
        <UCommandPalette
          v-model:search-term="searchTerm"
          :groups="commandGroups"
          :fuse="{
            fuseOptions: {
              ignoreLocation: true,
              threshold: 0.2,
              keys: ['label', 'suffix', 'description'],
            },
            resultLimit: 50,
            matchAllWhenSearchEmpty: true,
          }"
          close
          placeholder="Search departments, resources, and people…"
          @update:model-value="onSelect"
          @update:open="onPaletteOpenChange"
        />
      </template>
    </UModal>
  </ClientOnly>
</template>

<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'

const { data: session } = useAuth()
const isSignedIn = computed(() => Boolean(session.value?.user?.email))

const { open, searchTerm } = useSiteSearchModal()

const {
  links,
  groups,
  loading,
  loadIndex,
} = useSiteSearch(searchTerm)

type Item = CommandPaletteItem
type Group = CommandPaletteGroup<Item>

const commandGroups = computed<Group[]>(() => groups.value as unknown as Group[])

function onSelect(item: any) {
  if (item?.disabled) return
  open.value = false
  searchTerm.value = ''
}

function onPaletteOpenChange(isOpen: boolean) {
  open.value = isOpen
  if (!isOpen) searchTerm.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key.toLowerCase() !== 'k') return
  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
  const mod = isMac ? e.metaKey : e.ctrlKey
  if (!mod) return
  e.preventDefault()
  open.value = true
}

onMounted(() => {
  if (!import.meta.client) return
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (!import.meta.client) return
  window.removeEventListener('keydown', onKeydown)
})

watch(isSignedIn, (signedIn) => {
  if (signedIn) loadIndex()
}, { immediate: true })

watch(open, (isOpen) => {
  if (isOpen && isSignedIn.value) loadIndex()
})
</script>

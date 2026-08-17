<template>
  <UModal
    v-model:open="isOpen"
    :close="false"
    :ui="{
      overlay: 'bg-black/70',
      content: 'max-w-5xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden bg-black ring-0 shadow-2xl divide-y-0',
      header: 'hidden p-0 min-h-0',
      body: 'p-0 sm:p-0 overflow-hidden'
    }"
  >
    <template #body="{ close }">
      <div v-if="comic?.url" class="relative bg-black overflow-hidden flex flex-col max-h-[90vh]">
        <button
          type="button"
          class="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          aria-label="Close"
          @click="close"
        >
          <UIcon name="i-lucide-x" class="h-4 w-4" />
        </button>
        <div class="relative min-h-0">
          <img
            :src="comic.url"
            :alt="comic.alt || 'Keener\'s Comics'"
            class="block mx-auto max-h-[90vh] w-auto max-w-full object-contain"
          >
          <button
            v-if="showNav"
            type="button"
            class="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-2 text-white bg-black/50 rounded hover:bg-black/70 disabled:pointer-events-none disabled:opacity-30"
            aria-label="Previous comic"
            :disabled="!canPrev"
            @click="emit('prev')"
          >
            ‹
          </button>
          <button
            v-if="showNav"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 text-white bg-black/50 rounded hover:bg-black/70 disabled:pointer-events-none disabled:opacity-30"
            aria-label="Next comic"
            :disabled="!canNext"
            @click="emit('next')"
          >
            ›
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
export type KeenersComic = {
  id?: number
  url?: string | null
  alt?: string
}

const props = defineProps<{
  open: boolean
  comic?: KeenersComic | null
  showNav?: boolean
  canPrev?: boolean
  canNext?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  prev: []
  next: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})
</script>

<template>
  <div v-if="comic?.url" class="w-full max-w-[180px]">
    <button
      type="button"
      class="w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-gray-200 hover:shadow"
      @click="open = true"
    >
      <img
        :src="comic.url"
        :alt="comic.alt || 'Keener\'s Comics'"
        class="w-full"
      >
    </button>
    <NuxtLink
      to="/keeners-comics"
      class="mt-2 block text-center text-xs text-[rgba(13,94,130,1)] hover:underline"
    >
      Archive
    </NuxtLink>

    <KeenersComicsLightbox v-model:open="open" :comic="comic" />
  </div>
</template>

<script setup lang="ts">
type Comic = {
  id?: number
  url?: string | null
  alt?: string
}

type TodayResponse = {
  date?: string
  comic?: Comic | null
}

const open = ref(false)

const { data } = useFetch<TodayResponse>('/api/keeners-comics/today', {
  key: 'keeners-comics-today',
  lazy: true,
})

const comic = computed(() => data.value?.comic || null)
</script>

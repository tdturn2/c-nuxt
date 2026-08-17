<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold tracking-tight text-[rgba(13,94,130,1)]">Keener's Comics</h1>
        <p class="mt-2 text-sm text-gray-600">The full pool of daily comics.</p>

        <div v-if="pending && !comics.length" class="mt-6 text-gray-500">Loading comics...</div>
        <div v-else-if="error" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {{ error.message || 'Failed to load comics.' }}
        </div>
        <div v-else-if="!comics.length" class="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No comics found.
        </div>

        <template v-else>
          <p class="mt-4 text-sm text-gray-500">
            Showing {{ rangeStart }}–{{ rangeEnd }} of {{ totalDocs }}
          </p>
          <div
            class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            :class="{ 'opacity-60': pending }"
          >
            <button
              v-for="comic in comics"
              :key="String(comic.id)"
              type="button"
              class="rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition hover:border-gray-300 hover:shadow-md"
              @click="openComic(comic)"
            >
              <img
                v-if="comic.url"
                :src="comic.url"
                :alt="comic.alt || 'Keener\'s Comics'"
                class="w-full h-auto"
                loading="lazy"
              >
            </button>
          </div>

          <div v-if="totalPages > 1" class="mt-6 flex flex-wrap items-center justify-between gap-2 sm:justify-center">
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              :disabled="page <= 1 || pending"
              @click="goToPage(page - 1)"
            >
              Previous
            </button>
            <span class="text-sm text-gray-600">
              Page {{ page }} of {{ totalPages }}
            </span>
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              :disabled="page >= totalPages || pending"
              @click="goToPage(page + 1)"
            >
              Next
            </button>
          </div>
        </template>
      </div>
    </main>

    <KeenersComicsLightbox
      v-model:open="lightboxOpen"
      :comic="selected"
      :show-nav="totalDocs > 1"
      :can-prev="canPrev"
      :can-next="canNext"
      @prev="showPrev"
      @next="showNext"
    />
  </div>
</template>

<script setup lang="ts">
type Comic = {
  id?: number
  url?: string | null
  alt?: string
}

type ArchiveResponse = {
  docs?: Comic[]
  totalDocs?: number
  page?: number
  limit?: number
  totalPages?: number
}

const PAGE_SIZE = 50

useHead({
  title: "Keener's Comics",
})

const route = useRoute()
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data, pending, error } = useFetch<ArchiveResponse>('/api/keeners-comics/archive', {
  key: 'keeners-comics-archive',
  query: { page, limit: PAGE_SIZE },
  watch: [page],
  lazy: true,
})

const comics = computed(() => (Array.isArray(data.value?.docs) ? data.value.docs.filter((comic) => comic.url) : []))
const totalDocs = computed(() => data.value?.totalDocs ?? 0)
const totalPages = computed(() => data.value?.totalPages ?? 1)
const rangeStart = computed(() => (totalDocs.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1))
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, totalDocs.value))

const lightboxOpen = ref(false)
const selected = ref<Comic | null>(null)
const pendingSelect = ref<'first' | 'last' | null>(null)

const selectedIndex = computed(() => {
  const id = selected.value?.id
  if (id == null) return -1
  return comics.value.findIndex((comic) => comic.id === id)
})

const canPrev = computed(() => selectedIndex.value > 0 || page.value > 1)
const canNext = computed(() => {
  if (selectedIndex.value < 0) return false
  return selectedIndex.value < comics.value.length - 1 || page.value < totalPages.value
})

function openComic(comic: Comic) {
  selected.value = comic
  lightboxOpen.value = true
}

function goToPage(next: number, keepLightbox = false) {
  const clamped = Math.min(totalPages.value, Math.max(1, next))
  if (!keepLightbox) lightboxOpen.value = false
  navigateTo({
    path: '/keeners-comics',
    query: clamped <= 1 ? {} : { page: String(clamped) },
  })
}

function showPrev() {
  const index = selectedIndex.value
  if (index > 0) {
    selected.value = comics.value[index - 1] || null
    return
  }
  if (page.value > 1) {
    pendingSelect.value = 'last'
    goToPage(page.value - 1, true)
  }
}

function showNext() {
  const index = selectedIndex.value
  if (index >= 0 && index < comics.value.length - 1) {
    selected.value = comics.value[index + 1] || null
    return
  }
  if (page.value < totalPages.value) {
    pendingSelect.value = 'first'
    goToPage(page.value + 1, true)
  }
}

watch([pending, comics], () => {
  if (pending.value || !lightboxOpen.value || !pendingSelect.value) return
  const list = comics.value
  if (!list.length) return
  selected.value = pendingSelect.value === 'first' ? list[0] || null : list[list.length - 1] || null
  pendingSelect.value = null
})

function onKeydown(event: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    showPrev()
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    showNext()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

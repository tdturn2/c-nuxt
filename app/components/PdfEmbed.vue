<template>
  <div class="rounded-lg border border-gray-200 bg-white shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div class="min-w-0">
        <h2 class="truncate text-sm font-semibold text-gray-900">
          {{ title || 'PDF Document' }}
        </h2>
        <p class="truncate text-xs text-gray-500">{{ src }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          v-if="backTo"
          :to="backTo"
          class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[rgba(10,69,92,1)]"
        >
          Back to page
        </NuxtLink>
        <a
          :href="src"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Open in new tab
        </a>
        <a
          :href="src"
          download
          class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[rgba(10,69,92,1)]"
        >
          Download
        </a>
      </div>
    </div>

    <div
      v-if="useBlobPipeline && loadState === 'loading'"
      class="flex items-center justify-center rounded-b-lg border-t border-gray-100 bg-gray-50 text-sm text-gray-600"
      :style="{ height }"
    >
      Loading PDF…
    </div>
    <div
      v-else-if="useBlobPipeline && loadState === 'error'"
      class="rounded-b-lg border-t border-amber-100 bg-amber-50 px-4 py-6 text-sm text-amber-900"
      :style="{ height }"
    >
      <p class="font-medium">Could not load this PDF in the viewer.</p>
      <p class="mt-2">Try opening it in a new tab instead.</p>
    </div>
    <iframe
      v-else-if="iframeSrc"
      :src="iframeSrc"
      :title="title || 'PDF Document'"
      class="w-full rounded-b-lg"
      :style="{ height }"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  src: string
  title?: string
  height?: string
  backTo?: string
}>(), {
  title: 'PDF Document',
  height: 'calc(100vh - 13rem)',
  backTo: '',
})

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

function isPdfProxyPath(s: string): boolean {
  return Boolean(s && s.startsWith('/api/pdf-proxy'))
}

const iframeSrc = ref('')
const loadState = ref<LoadState>('idle')

const useBlobPipeline = computed(() => isPdfProxyPath(props.src))

function revokeCurrentBlob() {
  const cur = iframeSrc.value
  if (cur.startsWith('blob:')) {
    URL.revokeObjectURL(cur)
  }
}

async function resolveIframeSrc(s: string) {
  revokeCurrentBlob()
  iframeSrc.value = ''
  if (!s) {
    loadState.value = 'idle'
    return
  }

  if (!isPdfProxyPath(s)) {
    iframeSrc.value = s
    loadState.value = 'ready'
    return
  }

  loadState.value = 'loading'
  try {
    const res = await fetch(s, { credentials: 'same-origin' })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const blob = await res.blob()
    iframeSrc.value = URL.createObjectURL(blob)
    loadState.value = 'ready'
  } catch {
    loadState.value = 'error'
    iframeSrc.value = ''
  }
}

watch(
  () => props.src,
  (s) => {
    if (import.meta.server) {
      if (!s) return
      if (isPdfProxyPath(s)) {
        loadState.value = 'loading'
      } else {
        iframeSrc.value = s
        loadState.value = 'ready'
      }
      return
    }
    void resolveIframeSrc(s)
  },
  { immediate: true },
)

onMounted(() => {
  if (import.meta.client && isPdfProxyPath(props.src) && loadState.value !== 'ready' && loadState.value !== 'error') {
    void resolveIframeSrc(props.src)
  }
})

onBeforeUnmount(() => {
  revokeCurrentBlob()
})
</script>

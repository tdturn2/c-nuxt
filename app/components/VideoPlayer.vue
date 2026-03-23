<template>
  <div
    v-if="currentVideo"
    class="fixed bottom-4 right-4 w-[500px] max-w-[calc(100vw-2rem)] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-40"
  >
    <div class="p-3">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-medium text-white truncate flex-1 min-w-0">{{ currentVideo.title }}</span>
        <button
          @click="close"
          class="flex-shrink-0 w-6 h-6 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
      <div class="plyr-slot">
        <!-- No :key here. We manage the DOM manually. -->
        <div ref="container" class="plyr-container rounded overflow-hidden bg-black" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'plyr/dist/plyr.css'

const PlyrPromise = import.meta.client ? import('plyr').then((m) => m.default) : null

const { currentVideo, close } = useVideoPlayer()
const container = ref<HTMLElement | null>(null)
let plyrInstance: import('plyr').default | null = null

const destroyPlyr = () => {
  if (plyrInstance) {
    try { plyrInstance.destroy() } catch (_) {}
    plyrInstance = null
  }
}

const initPlyr = async (vimeoId: string) => {
  if (!import.meta.client || !PlyrPromise || !container.value) return

  const Plyr = await PlyrPromise

  // Guard after await
  if (currentVideo.value?.vimeoId !== vimeoId || !container.value) return

  // Wipe whatever Plyr left behind and put a fresh target div in
  container.value.innerHTML = ''
  const target = document.createElement('div')
  target.setAttribute('data-plyr-provider', 'vimeo')
  target.setAttribute('data-plyr-embed-id', vimeoId)
  container.value.appendChild(target)

  const plyr = new Plyr(target, { ratio: '16:9', hideControls: false })
  plyr.on('ready', () => {
    const p = plyr.play()
    if (p?.catch) p.catch(() => {})
  })
  plyrInstance = plyr
}

watch(
  () => currentVideo.value?.vimeoId,
  async (vimeoId) => {
    destroyPlyr()
    if (!vimeoId) return
    await nextTick()
    initPlyr(vimeoId)
  },
  { immediate: true }
)

onBeforeUnmount(destroyPlyr)
</script>

<style>
.plyr-slot {
  position: relative;
  aspect-ratio: 16 / 9;
  max-height: 220px;
  width: 100%;
}

.plyr-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.plyr-container .plyr {
  border-radius: 0.375rem;
}
</style>
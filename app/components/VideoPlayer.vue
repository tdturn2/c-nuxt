<template>
  <div
    v-if="currentVideo"
    class="fixed bottom-4 right-4 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-asbury-blue border border-[rgba(255,255,255,0.18)] rounded-lg shadow-xl z-40 overflow-hidden select-none"
    :style="rootStyle"
  >
    <div class="h-full flex flex-col">
      <div class="px-3 pt-3 pb-2 flex items-center gap-2 pl-7">
        <span class="text-xs font-medium text-white truncate flex-1 min-w-0 pr-2">{{ currentVideo.title }}</span>
        <button
          @click="close"
          class="shrink-0 w-6 h-6 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>
      <div class="px-3 pb-3">
        <div class="plyr-slot">
          <!-- No :key here. We manage the DOM manually. -->
          <div ref="container" class="plyr-container rounded overflow-hidden bg-black" />
        </div>
      </div>
      <div
        class="absolute top-1 left-1 w-4 h-4 cursor-nwse-resize opacity-70 hover:opacity-100"
        aria-label="Resize video player"
        title="Drag to resize"
        @pointerdown="onResizePointerDown"
      >
        <svg viewBox="0 0 16 16" class="w-full h-full text-gray-300">
          <path fill="currentColor" d="M10 16h6v-2h-4v-4h-2v6zM6 16h2V6H0v2h6v8z" opacity="0" />
          <path
            fill="currentColor"
            d="M6.5 15.5H15.5V14H8V6.5H6.5V15.5ZM10 14h4v-4h-1.5v2.5H10V14Zm0-3.5h1.5V8H10v2.5Z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import 'plyr/dist/plyr.css'

const PlyrPromise = import.meta.client
  ? import('plyr').then((m: any) => (m?.default ?? m) as any)
  : null

const { currentVideo, close } = useVideoPlayer()
const container = ref<HTMLElement | null>(null)
let plyrInstance: import('plyr').default | null = null

const STORAGE_KEY = 'connect.videoPlayer.size.v1'
const width = ref(520)

const rootStyle = computed(() => ({
  width: `${width.value}px`,
}))

if (import.meta.client) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { width?: unknown }
      const w = Number(parsed.width)
      if (Number.isFinite(w)) width.value = Math.min(Math.max(w, 360), 900)
    }
  } catch {}
}

const destroyPlyr = () => {
  if (plyrInstance) {
    try { plyrInstance.destroy() } catch (_) {}
    plyrInstance = null
  }
}

type EmbedKind = 'vimeo' | 'youtube'

const initPlyr = async (kind: EmbedKind, embedId: string) => {
  if (!import.meta.client || !PlyrPromise || !container.value) return

  const Plyr = await PlyrPromise

  // Guard after await — current track may have changed
  const v = currentVideo.value
  if (!container.value || !v) return
  if (kind === 'vimeo' && v.vimeoId !== embedId) return
  if (kind === 'youtube' && v.youtubeId !== embedId) return

  // Wipe whatever Plyr left behind and put a fresh target div in
  container.value.innerHTML = ''
  const target = document.createElement('div')
  target.setAttribute('data-plyr-provider', kind)
  target.setAttribute('data-plyr-embed-id', embedId)
  container.value.appendChild(target)

  const plyr = new Plyr(target, {
    ratio: '16:9',
    hideControls: false,
    ...(kind === 'youtube'
      ? {
          youtube: {
            noCookie: true,
          },
        }
      : {}),
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'settings',
      'fullscreen',
    ],
  })
  plyr.on('ready', () => {
    const p = plyr.play()
    if (p?.catch) p.catch(() => {})
  })
  plyrInstance = plyr
}

const embedRef = computed(() => {
  const v = currentVideo.value
  if (!v) return null
  if (v.youtubeId?.trim()) return { kind: 'youtube' as const, id: v.youtubeId.trim() }
  if (v.vimeoId?.trim()) return { kind: 'vimeo' as const, id: v.vimeoId.trim() }
  return null
})

watch(
  embedRef,
  async (ref) => {
    destroyPlyr()
    if (!ref) return
    await nextTick()
    initPlyr(ref.kind, ref.id)
  },
  { immediate: true }
)

onBeforeUnmount(destroyPlyr)

let resizePointerId: number | null = null
let startX = 0
let startY = 0
let startW = 0

function persistSize() {
  if (!import.meta.client) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ width: width.value }))
  } catch {}
}

function onResizePointerDown(e: PointerEvent) {
  if (!import.meta.client) return
  resizePointerId = e.pointerId
  startX = e.clientX
  startY = e.clientY
  startW = width.value
  ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onResizePointerMove)
  window.addEventListener('pointerup', onResizePointerUp, { once: true })
}

function onResizePointerMove(e: PointerEvent) {
  if (!import.meta.client) return
  if (resizePointerId == null) return
  if (e.pointerId !== resizePointerId) return

  const dx = e.clientX - startX
  // Keep 16:9 by driving only width; height follows via CSS aspect-ratio.
  // Top-left handle: dragging left grows, right shrinks.
  width.value = Math.min(Math.max(startW - dx, 360), 900)
}

function onResizePointerUp() {
  if (!import.meta.client) return
  resizePointerId = null
  window.removeEventListener('pointermove', onResizePointerMove)
  persistSize()
}
</script>

<style>
.plyr-slot {
  position: relative;
  aspect-ratio: 16 / 9;
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

/* Make sure controls are visible against dark chrome. */
.plyr--video {
  background: #000;
}

/* Brand the Plyr UI with asbury-blue. */
/* Plyr uses CSS variables like --plyr-color-main for progress + accents. */
.plyr {
  --plyr-color-main: var(--color-asbury-blue);
}

.plyr__control--overlaid {
  background: var(--color-asbury-blue);
}

.plyr--video .plyr__controls {
  background: linear-gradient(
    rgba(0, 0, 0, 0),
    rgba(0, 0, 0, 0.55)
  );
}

/* Progress bar + played portion */
.plyr--full-ui .plyr__progress input[type='range'] {
  color: var(--color-asbury-blue);
}

/* Focus ring */
.plyr__control:focus-visible {
  outline: 2px solid var(--color-asbury-blue);
  outline-offset: 2px;
}
</style>
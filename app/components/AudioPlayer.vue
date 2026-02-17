<template>
  <div 
    v-if="currentTrack"
    class="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-lg z-50"
  >
    <div class="container mx-auto px-4 py-3 max-w-7xl">
      <!-- Top Row: Artwork, Info, and Controls -->
      <div class="flex items-center gap-4 mb-2">
        <!-- Artwork -->
        <div class="flex-shrink-0">
          <img 
            :src="currentTrack.artwork || '/estes-icon.png'" 
            :alt="currentTrack.title"
            class="w-16 h-16 rounded object-cover"
          />
        </div>

        <!-- Track Info -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-white truncate">{{ currentTrack.title }}</div>
          <div class="text-sm text-gray-400 truncate">{{ currentTrack.artist }}</div>
        </div>

        <!-- Play/Pause Button -->
        <button
          @click="togglePlayback"
          class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
          :disabled="isLoading"
        >
          <UIcon 
            :name="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'" 
            class="w-5 h-5"
          />
        </button>

        <!-- Volume -->
        <div class="flex items-center gap-2 min-w-[100px] hidden sm:flex">
          <UIcon name="i-heroicons-speaker-wave" class="w-4 h-4 text-gray-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="volume"
            @input="(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))"
            class="w-20"
          />
        </div>

        <!-- Close Button -->
        <button
          @click="stop"
          class="flex-shrink-0 w-8 h-8 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white flex items-center justify-center transition-colors"
        >
          <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
        </button>
      </div>

      <!-- Bottom Row: Timeline with Time Display -->
      <div class="flex items-center gap-3">
        <!-- Time Display -->
        <div class="flex items-center gap-2 text-sm text-gray-300 min-w-[100px] flex-shrink-0">
          <span>{{ formatTime(currentTime) }}</span>
          <span>/</span>
          <span>{{ formatTime(duration) }}</span>
        </div>

        <!-- Timeline/Progress Bar -->
        <div class="flex-1 relative min-w-0">
            <div 
              class="relative h-3 bg-gray-700 rounded-full cursor-pointer group border border-gray-600"
              @click="handleProgressClick"
              @mousemove="handleTimelineHover"
              @mouseleave="hoverTime = null"
            >
              <!-- Progress Fill -->
              <div 
                class="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
                :style="{ width: `${Math.max(0, Math.min(100, progress))}%` }"
              />
              <!-- Hover Indicator -->
              <div 
                v-if="hoverTime !== null && duration > 0"
                class="absolute top-0 h-full w-0.5 bg-blue-400 opacity-70 z-10"
                :style="{ left: `${Math.max(0, Math.min(100, (hoverTime / duration) * 100))}%` }"
              />
              <!-- Playhead -->
              <div 
                class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full shadow-lg border-2 border-gray-900 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                :style="{ left: `calc(${Math.max(0, Math.min(100, progress))}% - 8px)` }"
              />
            </div>
            <!-- Time Tooltip on Hover -->
            <div 
              v-if="hoverTime !== null && duration > 0"
              class="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded pointer-events-none whitespace-nowrap z-10"
              :style="{ left: `${Math.max(0, Math.min(100, (hoverTime / duration) * 100))}%`, transform: 'translateX(-50%)' }"
            >
              {{ formatTime(hoverTime) }}
            </div>
          </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="isLoading" class="mt-2">
        <div class="h-1 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full bg-blue-500 animate-pulse" style="width: 30%" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  currentTrack,
  isPlaying,
  isLoading,
  duration,
  currentTime,
  volume,
  progress,
  togglePlayback,
  seek,
  setVolume,
  stop,
  formatTime
} = useAudioPlayer()

const hoverTime = ref<number | null>(null)

const handleProgressClick = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  const newTime = Math.max(0, Math.min(duration.value, percent * duration.value))
  seek(newTime)
}

const handleTimelineHover = (e: MouseEvent) => {
  if (duration.value === 0) {
    hoverTime.value = null
    return
  }
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  hoverTime.value = Math.max(0, Math.min(duration.value, percent * duration.value))
}
</script>

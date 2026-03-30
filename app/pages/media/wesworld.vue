<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
  <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header class="mb-8 overflow-hidden">
        <img
          src="https://ats-edu.storage.googleapis.com/uploads/WesWorld-1400.png"
          alt="WesWorld"
          class="w-[120px] h-auto float-left mr-6 mb-2 rounded-lg"
        />
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
          WesWorld Archive
        </h1>
        <p class="mt-2 text-gray-600">
          A biweekly podcast about all things Wesleyan and beyond: hosted by Maggie Ulmer, Dr. Scott Kisker, and Dr. David Watson.
        </p>
      </header>

      <!-- Search -->
      <div class="mb-6">
        <UInput
          v-model="searchQuery"
          placeholder="Search by title..."
          size="md"
          class="max-w-md"
        >
          <template #leading>
            <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400" />
          </template>
        </UInput>
      </div>

      <!-- Loading -->
      <div v-if="pending" class="flex justify-center py-16">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 text-[rgba(13,94,130,1)] animate-spin" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-lg bg-red-50 border border-red-200 p-6 text-red-800">
        {{ error.message || 'Failed to load WesWorld episodes.' }}
      </div>

      <!-- Empty -->
      <div v-else-if="filteredEpisodes.length === 0" class="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
        <UIcon name="i-heroicons-speaker-wave" class="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p class="font-medium">{{ searchQuery.trim() ? 'No episodes match your search' : 'No episodes found' }}</p>
        <p class="text-sm mt-1">{{ searchQuery.trim() ? 'Try a different search term.' : 'Check back later for new episodes.' }}</p>
      </div>

      <!-- Episode list -->
      <div v-else>
        <p v-if="searchQuery.trim()" class="mb-3 text-sm text-gray-500">
          Showing {{ filteredEpisodes.length }} match{{ filteredEpisodes.length === 1 ? '' : 'es' }}.
        </p>
        <ul class="space-y-4">
          <li
            v-for="ep in filteredEpisodes"
            :key="ep.id"
            class="group rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-[rgba(13,94,130,0.3)] transition-all"
          >
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <!-- Date -->
              <div class="shrink-0 w-20 text-center sm:text-left">
                <span class="text-xs font-medium uppercase text-gray-500 tracking-wider">
                  {{ formatDate(ep.pubDate) }}
                </span>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <h2 class="font-semibold text-gray-900 group-hover:text-[rgba(13,94,130,1)] transition-colors line-clamp-2">
                  {{ ep.title || 'WesWorld Episode' }}
                </h2>
                <p v-if="ep.artist" class="mt-0.5 text-sm text-gray-500 truncate">
                  {{ ep.artist }}
                </p>
              </div>

              <!-- Play -->
              <div class="shrink-0">
                <UButton
                  variant="soft"
                  color="primary"
                  size="sm"
                  @click="playEpisode(ep)"
                  leading-icon="i-heroicons-play"
                >
                  Play Audio
                </UButton>
              </div>
            </div>
          </li>
        </ul>
      </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { PodcastFeed, PodcastEpisode } from '~/composables/usePodcasts'

const { getPodcast } = usePodcasts()
const podcast = getPodcast('wesworld')
const rssUrl = podcast?.rssUrl ?? ''

const { data: feedData, pending, error } = await useFetch<PodcastFeed>('/api/podcasts/feed', {
  query: { rssUrl }
})

const episodes = computed(() => {
  const feed = feedData.value
  const list = feed && 'episodes' in feed ? feed.episodes : []
  return [...list].sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0
    return dateB - dateA
  })
})

const searchQuery = ref('')

const filteredEpisodes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return episodes.value
  return episodes.value.filter((ep) => {
    const title = (ep.title || '').toLowerCase()
    const artist = (ep.artist || '').toLowerCase()
    const desc = (ep.description || '').toLowerCase()
    return title.includes(q) || artist.includes(q) || desc.includes(q)
  })
})

function formatDate(pubDate?: string): string {
  if (!pubDate) return '—'
  try {
    const d = new Date(pubDate)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return String(pubDate)
  }
}

const { playTrack } = useAudioPlayer()

function playEpisode(ep: PodcastEpisode) {
  playTrack({
    id: ep.id,
    audio: ep.audio,
    title: ep.title || 'WesWorld Episode',
    artist: ep.artist || 'WesWorld',
    artwork: ep.artwork || '/estes-icon.png',
    album: ep.album || 'WesWorld'
  })
}
</script>

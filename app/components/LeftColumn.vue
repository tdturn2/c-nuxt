<template>
  <aside class="w-64 flex-shrink-0">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-20">
      <div class="flex flex-col items-center text-center mb-6">
        <div class="w-[170px] overflow-hidden mb-4">
          <img src="/wesworld.png" alt="WesWorld" class="w-full h-full object-cover" />
        </div>
        <button 
          @click="() => playPodcastLatest('wesworld')"
          class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
        >
          Latest Episode
        </button>
      </div>
      
      <div class="flex flex-col items-center text-center mb-6">
        <div class="w-[170px] overflow-hidden mb-4">
          <img src="/its-elementary.jpg" alt="It's Elementary" class="w-full h-full object-cover" />
        </div>
        <button 
          @click="() => playPodcastLatest('elementary')"
          class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
        >
          Latest Episode
        </button>
      </div>
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div class="flex flex-col items-center text-center mb-6">
        <div class="w-[140px] overflow-hidden mb-4">
          <img src="/estes-icon.png" alt="Estes Chapel" class="w-full h-full object-cover" />
        </div>
        <button 
          @click="() => playPodcastLatest('chapel')"
          class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
        >
          Latest Chapel
        </button>
      </div>

      </div>

    </div>
  </aside>
</template>

<script setup lang="ts">
const { playTrack } = useAudioPlayer()
const { getPodcasts, fetchLatestEpisode, fetchPodcastFeed } = usePodcasts()

// Get all configured podcasts
const podcasts = getPodcasts()

/**
 * Play the latest episode from a podcast
 */
const playPodcastLatest = async (podcastId: string) => {
  try {
    const episode = await fetchLatestEpisode(podcastId)
    
    if (!episode) {
      console.error(`Failed to fetch latest episode for podcast: ${podcastId}`)
      return
    }

    // Play the episode
    playTrack({
      id: episode.id,
      audio: episode.audio,
      title: episode.title,
      artist: episode.artist,
      artwork: episode.artwork,
      album: episode.album
    })
  } catch (err) {
    console.error(`Error playing podcast ${podcastId}:`, err)
  }
}

/**
 * Play all episodes from a podcast as a playlist
 */
const playPodcastPlaylist = async (podcastId: string) => {
  try {
    const feed = await fetchPodcastFeed(podcastId)
    
    if (!feed || !feed.episodes.length) {
      console.error(`Failed to fetch feed or no episodes found for podcast: ${podcastId}`)
      return
    }

    // Convert episodes to tracks format
    const tracks = feed.episodes.map(episode => ({
      id: episode.id,
      audio: episode.audio,
      title: episode.title,
      artist: episode.artist,
      artwork: episode.artwork,
      album: episode.album
    }))

    // Play as playlist (starting with first episode)
    // For now, just play the first track - can add playlist support later
    if (tracks.length > 0 && tracks[0]) {
      playTrack(tracks[0])
    }
  } catch (err) {
    console.error(`Error playing podcast playlist ${podcastId}:`, err)
  }
}
</script>

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
        <div class="w-[170px] overflow-hidden mb-4">
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

// Pre-fetch and preload latest episodes when component mounts
// This way audio is already buffering when user clicks
const preloadedEpisodes = new Map<string, { audio: HTMLAudioElement; episode: any }>()

onMounted(async () => {
  // Pre-fetch all podcast episodes in the background
  // This starts downloading audio immediately so it's ready when user clicks
  console.log('Preloading podcast episodes...')
  
  for (const podcast of podcasts) {
    try {
      const episode = await fetchLatestEpisode(podcast.id)
      if (episode?.audio) {
        // Create and start loading audio element immediately
        const audio = new Audio()
        audio.preload = 'auto'
        audio.crossOrigin = 'anonymous'
        audio.src = episode.audio
        audio.load() // Start downloading immediately
        
        // Store for later use
        preloadedEpisodes.set(podcast.id, { audio, episode })
        
        console.log(`✅ Preloaded: ${podcast.name}`)
        
        // Also preload the 'chapel' podcast if it exists
        if (podcast.id === 'chapel') {
          preloadedEpisodes.set('chapel', { audio, episode })
        }
      }
    } catch (err) {
      console.error(`Failed to preload ${podcast.name}:`, err)
    }
  }
  
  // Also preload chapel separately if it's not in the podcasts list
  try {
    const chapelEpisode = await fetchLatestEpisode('chapel')
    if (chapelEpisode?.audio && !preloadedEpisodes.has('chapel')) {
      const audio = new Audio()
      audio.preload = 'auto'
      audio.crossOrigin = 'anonymous'
      audio.src = chapelEpisode.audio
      audio.load()
      preloadedEpisodes.set('chapel', { audio, episode: chapelEpisode })
      console.log('✅ Preloaded: Chapel')
    }
  } catch (err) {
    console.error('Failed to preload Chapel:', err)
  }
})

/**
 * Play the latest episode from a podcast
 */
const playPodcastLatest = async (podcastId: string) => {
  const startTime = performance.now()
  try {
    console.log('Playing podcast latest:', podcastId)
    
    // Check if we have a preloaded episode (audio already buffering!)
    const preloaded = preloadedEpisodes.get(podcastId)
    
    let episode
    if (preloaded) {
      // Use preloaded episode - audio is already buffering!
      episode = preloaded.episode
      const { audio } = preloaded
      
      // Check buffering status
      if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        console.log(`✅ Audio already buffered (readyState: ${audio.readyState}) - should play instantly!`)
      } else {
        console.log(`⏳ Audio still loading (readyState: ${audio.readyState}) - will start soon`)
      }
    } else {
      // Fallback: fetch if not preloaded (shouldn't happen normally)
      console.log('⚠️ Episode not preloaded, fetching now...')
      const fetchStart = performance.now()
      episode = await fetchLatestEpisode(podcastId)
      const fetchTime = performance.now() - fetchStart
      console.log(`RSS fetch and parse took: ${fetchTime.toFixed(2)}ms`)
    }
    
    if (!episode) {
      console.error(`Failed to get episode for podcast: ${podcastId}`)
      return
    }

    console.log('Playing:', episode.title)
    console.log('Audio URL:', episode.audio)

    // Play immediately with Howler - should start playing as soon as buffered
    const playStart = performance.now()
    playTrack({
      id: episode.id,
      audio: episode.audio,
      title: episode.title,
      artist: episode.artist,
      artwork: episode.artwork,
      album: episode.album
    })
    const playTime = performance.now() - playStart
    console.log(`Track sent to Howler in: ${playTime.toFixed(2)}ms`)
    
    const totalTime = performance.now() - startTime
    console.log(`Total time: ${totalTime.toFixed(2)}ms`)
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

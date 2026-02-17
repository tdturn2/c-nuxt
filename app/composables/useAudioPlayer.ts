import { Howl } from 'howler'
import { ref, computed } from 'vue'

export interface AudioTrack {
  id: number
  audio: string
  title: string
  artist: string
  artwork: string
  album: string
}

const currentTrack = ref<AudioTrack | null>(null)
const howl = ref<Howl | null>(null)
const isPlaying = ref(false)
const isLoading = ref(false)
const duration = ref(0)
const currentTime = ref(0)
const volume = ref(1.0)

let timeUpdateInterval: ReturnType<typeof setInterval> | null = null

export const useAudioPlayer = () => {
  /**
   * Load and play a single track
   */
  const playTrack = (track: AudioTrack) => {
    // Stop current track if playing
    if (howl.value) {
      howl.value.unload()
      howl.value = null
    }

    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval)
      timeUpdateInterval = null
    }

    currentTrack.value = track
    isLoading.value = true

    // Create Howl instance with preload for faster playback
    howl.value = new Howl({
      src: [track.audio],
      html5: true, // Use HTML5 Audio for better buffering
      preload: true,
      volume: volume.value,
      onload: () => {
        isLoading.value = false
        duration.value = howl.value?.duration() || 0
        console.log('Audio loaded, duration:', duration.value)
      },
      onloaderror: (id, error) => {
        console.error('Error loading audio:', error)
        isLoading.value = false
      },
      onplay: () => {
        isPlaying.value = true
        isLoading.value = false
        startTimeUpdate()
        console.log('Audio started playing')
      },
      onpause: () => {
        isPlaying.value = false
        stopTimeUpdate()
      },
      onend: () => {
        isPlaying.value = false
        stopTimeUpdate()
        currentTime.value = 0
      },
      onseek: () => {
        currentTime.value = howl.value?.seek() || 0
      }
    })

    // Start playing immediately - Howler will buffer and play as soon as possible
    howl.value.play()
  }

  /**
   * Toggle play/pause
   */
  const togglePlayback = () => {
    if (!howl.value) return

    if (isPlaying.value) {
      howl.value.pause()
    } else {
      howl.value.play()
    }
  }

  /**
   * Seek to a specific time
   */
  const seek = (time: number) => {
    if (!howl.value) return
    howl.value.seek(time)
    currentTime.value = time
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  const setVolume = (vol: number) => {
    volume.value = Math.max(0, Math.min(1, vol))
    if (howl.value) {
      howl.value.volume(volume.value)
    }
  }

  /**
   * Stop and unload current track
   */
  const stop = () => {
    if (howl.value) {
      howl.value.stop()
      howl.value.unload()
      howl.value = null
    }
    isPlaying.value = false
    currentTrack.value = null
    currentTime.value = 0
    duration.value = 0
    stopTimeUpdate()
  }

  /**
   * Start time update interval
   */
  const startTimeUpdate = () => {
    if (timeUpdateInterval) return
    
    timeUpdateInterval = setInterval(() => {
      if (howl.value && isPlaying.value) {
        currentTime.value = howl.value.seek() as number
      }
    }, 100) // Update every 100ms
  }

  /**
   * Stop time update interval
   */
  const stopTimeUpdate = () => {
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval)
      timeUpdateInterval = null
    }
  }

  /**
   * Format time in seconds to MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return {
    // State
    currentTrack: computed(() => currentTrack.value),
    isPlaying: computed(() => isPlaying.value),
    isLoading: computed(() => isLoading.value),
    duration: computed(() => duration.value),
    currentTime: computed(() => currentTime.value),
    volume: computed(() => volume.value),
    progress: computed(() => {
      if (duration.value === 0) return 0
      return (currentTime.value / duration.value) * 100
    }),
    
    // Methods
    playTrack,
    togglePlayback,
    seek,
    setVolume,
    stop,
    formatTime
  }
}

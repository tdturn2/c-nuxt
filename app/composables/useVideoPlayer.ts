import { ref, computed } from 'vue'

export interface VideoTrack {
  title: string
  vimeoId?: string
  youtubeId?: string
  mode?: 'vimeoVideo'
}

export interface VimeoCollectionTrack {
  title: string
  iframeUrl: string
  mode: 'vimeoCollection'
}

export type PlayerTrack = VideoTrack | VimeoCollectionTrack

const currentVideo = ref<PlayerTrack | null>(null)

export const useVideoPlayer = () => {
  const playVideo = (video: VideoTrack) => {
    if (!video.vimeoId?.trim() && !video.youtubeId?.trim()) return
    const { stop: stopAudio } = useAudioPlayer()
    stopAudio()
    currentVideo.value = {
      ...video,
      mode: 'vimeoVideo',
    }
  }

  const playVimeoCollection = (video: Omit<VimeoCollectionTrack, 'mode'>) => {
    if (!video.iframeUrl?.trim()) return
    const { stop: stopAudio } = useAudioPlayer()
    stopAudio()
    currentVideo.value = {
      ...video,
      mode: 'vimeoCollection',
    }
  }

  const close = () => {
    currentVideo.value = null
  }

  return {
    currentVideo: computed(() => currentVideo.value),
    playVideo,
    playVimeoCollection,
    close
  }
}

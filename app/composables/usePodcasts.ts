export interface PodcastConfig {
  id: string
  name: string
  rssUrl: string
  artwork?: string
}

export interface PodcastEpisode {
  id: number
  audio: string
  title: string
  artist: string
  artwork: string
  album: string
  description?: string
  pubDate?: string
}

export interface PodcastFeed {
  id: string
  name: string
  description?: string
  artwork: string
  episodes: PodcastEpisode[]
}

/**
 * Composable for managing podcast feeds
 */
export const usePodcasts = () => {
  const config = useRuntimeConfig()
  const podcasts = config.public.podcasts as PodcastConfig[]

  /**
   * Get all configured podcast feeds
   */
  const getPodcasts = (): PodcastConfig[] => {
    return podcasts || []
  }

  /**
   * Get a specific podcast by ID
   */
  const getPodcast = (id: string): PodcastConfig | undefined => {
    return podcasts?.find(p => p.id === id)
  }

  /**
   * Fetch all episodes from a podcast feed
   */
  const fetchPodcastFeed = async (podcastId: string): Promise<PodcastFeed | null> => {
    const podcast = getPodcast(podcastId)
    if (!podcast) {
      console.error(`Podcast with id "${podcastId}" not found`)
      return null
    }

    try {
      const { data, error } = await useFetch<PodcastFeed>('/api/podcasts/feed', {
        query: {
          rssUrl: podcast.rssUrl
        }
      })

      if (error.value || !data.value) {
        console.error('Error fetching podcast feed:', error.value)
        return null
      }

      return data.value
    } catch (err) {
      console.error('Error fetching podcast feed:', err)
      return null
    }
  }

  /**
   * Fetch the latest episode from a podcast feed
   */
  const fetchLatestEpisode = async (podcastId: string): Promise<PodcastEpisode | null> => {
    const podcast = getPodcast(podcastId)
    if (!podcast) {
      console.error(`Podcast with id "${podcastId}" not found`)
      return null
    }

    try {
      const { data, error } = await useFetch<PodcastEpisode>('/api/podcasts/latest', {
        query: {
          rssUrl: podcast.rssUrl
        }
      })

      if (error.value || !data.value) {
        console.error('Error fetching latest episode:', error.value)
        return null
      }

      return data.value
    } catch (err) {
      console.error('Error fetching latest episode:', err)
      return null
    }
  }

  return {
    getPodcasts,
    getPodcast,
    fetchPodcastFeed,
    fetchLatestEpisode
  }
}

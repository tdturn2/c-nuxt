import { defineEventHandler, getQuery, createError } from 'h3'
import { podcastCache } from '../../utils/podcastCache'

interface PodcastEpisode {
  id: number
  audio: string
  title: string
  artist: string
  artwork: string
  album: string
  description?: string
  pubDate?: string
}

interface iTunesResult {
  feedUrl?: string
  collectionName?: string
  artworkUrl600?: string
}

/**
 * Fetches the latest episode from a podcast RSS feed
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rssUrl = (query.rssUrl || query.url) as string
  
  if (!rssUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'RSS feed URL is required'
    })
  }

  try {
    const startTime = Date.now()
    
    // Check cache first
    const cacheKey = `latest:${rssUrl}`
    const cached = podcastCache.get<PodcastEpisode>(cacheKey)
    if (cached) {
      const cacheTime = Date.now() - startTime
      console.log(`Podcast episode served from cache in: ${cacheTime}ms`)
      return cached
    }
    
    let rssFeedUrl = rssUrl
    
    // If it's an Apple Podcasts URL, get the RSS feed URL
    if (rssUrl.includes('podcasts.apple.com')) {
      // Extract podcast name from URL
      const match = rssUrl.match(/podcast\/([^/]+)/)
      if (match) {
        const podcastName = match[1]
        
        // Use iTunes Search API to get RSS feed
        try {
          const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(podcastName)}&entity=podcast&limit=1`
          const searchResponse = await $fetch<any>(searchUrl)
          
          if (searchResponse?.results?.length > 0) {
            const podcast = searchResponse.results[0] as iTunesResult
            if (podcast.feedUrl) {
              rssFeedUrl = podcast.feedUrl
            }
          }
        } catch (searchError) {
          console.error('Error fetching from iTunes API:', searchError)
          // Continue with original URL - might be an RSS feed already
        }
      }
    }

    // Fetch and parse RSS feed
    const rssResponse = await $fetch(rssFeedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PodcastFetcher/1.0)'
      }
    }) as string

    // Simple RSS XML parsing using regex (works for most podcast feeds)
    const extractTagContent = (xml: string, tagName: string, namespace?: string): string => {
      const fullTag = namespace ? `${namespace}:${tagName}` : tagName
      const regex = new RegExp(`<${fullTag}[^>]*>([\\s\\S]*?)<\\/${fullTag}>`, 'i')
      const match = xml.match(regex)
      return match ? match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : ''
    }

    const extractAttribute = (xml: string, tagName: string, attrName: string, namespace?: string): string => {
      const fullTag = namespace ? `${namespace}:${tagName}` : tagName
      const regex = new RegExp(`<${fullTag}[^>]*${attrName}=["']([^"']+)["']`, 'i')
      const match = xml.match(regex)
      return match ? match[1] : ''
    }

    // Extract channel info
    const channelMatch = rssResponse.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i)
    if (!channelMatch) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid RSS feed format - no channel found'
      })
    }

    const channelXml = channelMatch[1]
    const podcastTitle = extractTagContent(channelXml, 'title') || 'Unknown Podcast'
    const podcastImage = extractAttribute(channelXml, 'image', 'url') || 
                        extractAttribute(channelXml, 'itunes:image', 'href') || 
                        extractTagContent(channelXml, 'url') ||
                        '/estes-icon.png'
    const podcastDescription = extractTagContent(channelXml, 'description') || ''

    // Get latest episode (first item in RSS feed)
    const itemMatch = channelXml.match(/<item[^>]*>([\s\S]*?)<\/item>/i)
    if (!itemMatch) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No episodes found in podcast feed'
      })
    }

    const itemXml = itemMatch[1]
    const episodeTitle = extractTagContent(itemXml, 'title') || 'Untitled Episode'
    const episodeDescription = extractTagContent(itemXml, 'description') || ''
    const episodePubDate = extractTagContent(itemXml, 'pubDate') || ''
    
    // Find audio URL (enclosure or media:content)
    let audioUrl = extractAttribute(itemXml, 'enclosure', 'url') || 
                   extractAttribute(itemXml, 'media:content', 'url') || 
                   extractAttribute(itemXml, 'content', 'url') || ''
    
    if (!audioUrl) {
      // Try to find any link that might be an audio file
      const link = extractTagContent(itemXml, 'link')
      if (link && link.match(/\.(mp3|m4a|wav|ogg)$/i)) {
        audioUrl = link
      }
    }

    if (!audioUrl) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No audio URL found in latest episode'
      })
    }

    // Get episode artwork (itunes:image or media:thumbnail)
    const episodeArtwork = extractAttribute(itemXml, 'itunes:image', 'href') || 
                          extractAttribute(itemXml, 'media:thumbnail', 'url') || 
                          podcastImage

    const episode: PodcastEpisode = {
      id: Date.now(),
      audio: audioUrl,
      title: episodeTitle,
      artist: podcastTitle,
      artwork: episodeArtwork,
      album: podcastTitle,
      description: episodeDescription,
      pubDate: episodePubDate
    }

    const processingTime = Date.now() - startTime
    console.log(`Podcast episode processing took: ${processingTime}ms`)
    console.log(`Audio URL: ${audioUrl}`)

    // Cache the episode for 5 minutes (RSS feeds typically update infrequently)
    podcastCache.set(cacheKey, episode, 5 * 60 * 1000)

    return episode
  } catch (error: any) {
    console.error('Error fetching podcast episode:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch podcast episode',
      data: error.data
    })
  }
})

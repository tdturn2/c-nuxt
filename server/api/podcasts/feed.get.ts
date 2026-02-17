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

interface PodcastFeed {
  id: string
  name: string
  description?: string
  artwork: string
  episodes: PodcastEpisode[]
}

/**
 * RSS parsing utilities
 */
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

/**
 * Fetches all episodes from a podcast RSS feed
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rssUrl = query.rssUrl as string
  
  if (!rssUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: 'RSS feed URL is required'
    })
  }

  try {
    // Check cache first
    const cacheKey = `feed:${rssUrl}`
    const cached = podcastCache.get<PodcastFeed>(cacheKey)
    if (cached) {
      console.log(`Podcast feed served from cache`)
      return cached
    }

    // Fetch and parse RSS feed
    const rssResponse = await $fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PodcastFetcher/1.0)'
      }
    }) as string

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

    // Extract all episodes (items)
    const itemMatches = channelXml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)
    const episodes: PodcastEpisode[] = []
    let episodeId = Date.now()

    for (const itemMatch of itemMatches) {
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

      // Skip episodes without audio URL
      if (!audioUrl) {
        continue
      }

      // Get episode artwork (itunes:image or media:thumbnail)
      const episodeArtwork = extractAttribute(itemXml, 'itunes:image', 'href') || 
                            extractAttribute(itemXml, 'media:thumbnail', 'url') || 
                            podcastImage

      episodes.push({
        id: episodeId++,
        audio: audioUrl,
        title: episodeTitle,
        artist: podcastTitle,
        artwork: episodeArtwork,
        album: podcastTitle,
        description: episodeDescription,
        pubDate: episodePubDate
      })
    }

    if (episodes.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No episodes found in podcast feed'
      })
    }

    const feed: PodcastFeed = {
      id: podcastTitle.toLowerCase().replace(/\s+/g, '-'),
      name: podcastTitle,
      description: podcastDescription,
      artwork: podcastImage,
      episodes
    }

    // Cache the feed for 5 minutes
    podcastCache.set(cacheKey, feed, 5 * 60 * 1000)

    return feed
  } catch (error: any) {
    console.error('Error fetching podcast feed:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch podcast feed',
      data: error.data
    })
  }
})

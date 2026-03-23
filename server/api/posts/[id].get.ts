import { extractFirstPreviewUrlFromLexical, fetchAndCacheLinkPreview } from '../../utils/linkPreview'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Post ID is required'
    })
  }
  
  try {
    const cookieHeader = getHeader(event, 'cookie')
    const authHeader = getHeader(event, 'authorization')
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (authHeader) {
      headers['Authorization'] = authHeader
    }
    
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
    }
    
    const response: any = await $fetch(`${payloadBaseUrl}/api/connect-posts/${id}`, {
      headers,
      query: {
        populate: 'author.avatar,author.avatarConnectUserMedia,images.image,imagesConnectUserMedia.image'
      }
    })

    const toAbsoluteUrl = (url: string) => {
      if (!url || url.startsWith('http://') || url.startsWith('https://')) return url
      return url.startsWith('/') ? `${payloadBaseUrl}${url}` : `${payloadBaseUrl}/${url}`
    }

    // Backward compatibility: prefer legacy avatar, fallback to new avatarConnectUserMedia.
    if (!response?.author?.avatar?.url && response?.author?.avatarConnectUserMedia?.url) {
      response.author.avatar = response.author.avatarConnectUserMedia
    }

    if (response?.author?.avatar?.url) {
      response.author.avatar.url = toAbsoluteUrl(response.author.avatar.url)
    }

    // Backward compatibility: if legacy images are empty/missing, fallback to new imagesConnectUserMedia.
    if ((!response?.images || !Array.isArray(response.images) || response.images.length === 0) && Array.isArray(response?.imagesConnectUserMedia)) {
      response.images = response.imagesConnectUserMedia.map((img: any) => ({
        ...img,
        image: img?.image || null
      }))
    }

    if (response?.images && Array.isArray(response.images)) {
      response.images = response.images.map((img: any) => {
        if (img?.image?.url) {
          img.image.url = toAbsoluteUrl(img.image.url)
        }
        return img
      })
    }

    const previewUrl = extractFirstPreviewUrlFromLexical(response?.content)
    if (previewUrl) {
      try {
        response.linkPreview = await fetchAndCacheLinkPreview(previewUrl)
      } catch {
        response.linkPreview = null
      }
    } else {
      response.linkPreview = null
    }
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch post from PayloadCMS',
      data: error.data
    })
  }
})

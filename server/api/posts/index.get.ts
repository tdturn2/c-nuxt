import { extractFirstPreviewUrlFromLexical, fetchAndCacheLinkPreview } from '../../utils/linkPreview'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadApiUrl = config.public.payloadApiUrl || 'http://localhost:3002/api/connect-posts'
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  
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
    
    const toAbsoluteUrl = (url: string) => {
      if (!url || url.startsWith('http://') || url.startsWith('https://')) return url
      return url.startsWith('/') ? `${payloadBaseUrl}${url}` : `${payloadBaseUrl}/${url}`
    }

    // Fetch posts with populated author/image data (legacy + new connect-user-media fields)
    const response: any = await $fetch(payloadApiUrl, {
      headers,
      query: {
        populate: 'author.avatar,author.avatarConnectUserMedia,images.image,imagesConnectUserMedia.image'
      }
    })
    
    // Normalize image URLs and avatar URLs if they're relative
    if (response?.docs && Array.isArray(response.docs)) {
      const normalizedDocs = response.docs.map((post: any) => {
        // Backward compatibility: prefer legacy avatar, fallback to new avatarConnectUserMedia.
        if (!post.author?.avatar?.url && post.author?.avatarConnectUserMedia?.url) {
          post.author.avatar = post.author.avatarConnectUserMedia
        }

        if (post.author?.avatar?.url) {
          post.author.avatar.url = toAbsoluteUrl(post.author.avatar.url)
        }

        // Backward compatibility: if legacy images are empty/missing, fallback to new imagesConnectUserMedia.
        if ((!post.images || !Array.isArray(post.images) || post.images.length === 0) && Array.isArray(post.imagesConnectUserMedia)) {
          post.images = post.imagesConnectUserMedia.map((img: any) => ({
            ...img,
            image: img?.image || null
          }))
        }

        if (post.images && Array.isArray(post.images)) {
          post.images = post.images.map((img: any) => {
            if (img?.image?.url) {
              img.image.url = toAbsoluteUrl(img.image.url)
            }
            return img
          })
        }
        return post
      })

      response.docs = await Promise.all(
        normalizedDocs.map(async (post: any) => {
          const previewUrl = extractFirstPreviewUrlFromLexical(post?.content)
          if (!previewUrl) {
            post.linkPreview = null
            return post
          }
          try {
            post.linkPreview = await fetchAndCacheLinkPreview(previewUrl)
          } catch {
            post.linkPreview = null
          }
          return post
        })
      )
    }
    
    return response
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch posts.',
    })
  }
})

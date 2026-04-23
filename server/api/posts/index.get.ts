import { extractFirstPreviewUrlFromLexical, fetchAndCacheLinkPreview } from '../../utils/linkPreview'
import { verifyMobileAccessToken } from '../../utils/mobileAuth'

async function readSetCookieHeaders(res: { headers: Headers }): Promise<string[]> {
  const h = res.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof h.getSetCookie === 'function') return h.getSetCookie()
  const single = res.headers.get('set-cookie')
  return single ? [single] : []
}

function setCookieLinesToCookieHeader(setCookieLines: string[]): string | null {
  if (!setCookieLines.length) return null
  const pairs = setCookieLines
    .map((line) => line.split(';')[0]?.trim())
    .filter((p) => p && p.includes('='))
  return pairs.length ? pairs.join('; ') : null
}

async function resolveMobilePayloadAuth(authHeader: string, payloadBaseUrl: string) {
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]
  if (!token) return { isMobileBearer: false, payloadToken: null as string | null, payloadCookie: null as string | null }

  try {
    const claims = await verifyMobileAccessToken(token)
    const res = await $fetch.raw(`${payloadBaseUrl}/api/connect-users/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        email: claims.email,
        name: claims.name ?? undefined,
      },
    })
    const syncData: any = await res.json().catch(() => null)
    return {
      isMobileBearer: true,
      payloadToken: typeof syncData?.token === 'string' ? syncData.token : null,
      payloadCookie: setCookieLinesToCookieHeader(await readSetCookieHeaders(res)),
    }
  } catch {
    return { isMobileBearer: false, payloadToken: null as string | null, payloadCookie: null as string | null }
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadApiUrl = config.public.payloadApiUrl || 'http://localhost:3002/api/connect-posts'
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const query = getQuery(event)
  const debug = query.debug === '1'
  
  try {
    const cookieHeader = getHeader(event, 'cookie')
    const authHeader = getHeader(event, 'authorization')
    let incomingAuthWasMobile = false
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authHeader) {
      const mobilePayloadAuth = await resolveMobilePayloadAuth(authHeader, payloadBaseUrl)
      incomingAuthWasMobile = mobilePayloadAuth.isMobileBearer
      if (mobilePayloadAuth.isMobileBearer) {
        if (mobilePayloadAuth.payloadToken) {
          headers['Authorization'] = `Bearer ${mobilePayloadAuth.payloadToken}`
        }
        const mergedCookies = [cookieHeader, mobilePayloadAuth.payloadCookie].filter(Boolean).join('; ')
        if (mergedCookies) headers['Cookie'] = mergedCookies
      } else {
        headers['Authorization'] = authHeader
        if (cookieHeader) {
          headers['Cookie'] = cookieHeader
        }
      }
    } else if (cookieHeader) {
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
        populate: 'author.avatar,author.avatarConnectUserMedia,images.image,imagesConnectUserMedia.image',
        limit: 500,
        sort: '-createdAt',
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

      const enrichedDocs = await Promise.all(
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

      // Guard against any upstream duplicate rows by post id.
      const byId = new Map<string, any>()
      for (const post of enrichedDocs) {
        const key = String(post?.id ?? '')
        if (!key) continue
        if (!byId.has(key)) byId.set(key, post)
      }
      response.docs = Array.from(byId.values())

      if (debug) {
        const authorCounts = new Map<string, number>()
        for (const post of response.docs) {
          const name = String(post?.author?.name || 'unknown')
          authorCounts.set(name, (authorCounts.get(name) || 0) + 1)
        }
        response.debug = {
          totalDocs: response.docs.length,
          uniqueAuthors: authorCounts.size,
          topAuthors: Array.from(authorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10),
          incomingAuthHeader: Boolean(authHeader),
          incomingAuthWasMobile,
          forwardedAuthHeader: Boolean(headers.Authorization),
          usedCookieHeader: Boolean(headers.Cookie),
        }
      }
    }
    
    return response
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch posts.',
    })
  }
})

import { defineEventHandler, getQuery, createError, getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const query = getQuery(event)
  const postId = query.postId as string
  
  if (!postId) {
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

    // Fetch comments for the post, including populated author and post data
    // PayloadCMS uses where[post][equals]=postId format
    // Convert postId to number if it's a relationship field
    const postIdNum = parseInt(postId, 10)
    
    // console.log('Fetching comments for post:', postId, 'as number:', postIdNum)
    
    const response = await $fetch(`${payloadBaseUrl}/api/connect-comments`, {
      headers,
      query: {
        'where[post][equals]': postIdNum,
        depth: 2, // Use depth instead of populate for nested relationships
        sort: 'createdAt' // Sort by creation date
      }
    }) as { docs: Array<any> }
    
    // Ensure mentions are populated if they exist
    // PayloadCMS should return mentions as an array of user objects
    
    // console.log('Comments response:', response)
    
    // Normalize avatar URLs and parent field if they're relative
    if (response?.docs && Array.isArray(response.docs)) {
      response.docs = response.docs.map((comment: any) => {
        // Prefer new avatar relation, fallback to legacy avatar.
        if (comment.author) {
          comment.author.avatar = comment.author.avatarConnectUserMedia || comment.author.avatar || null
        }
        if (comment.post?.author) {
          comment.post.author.avatar = comment.post.author.avatarConnectUserMedia || comment.post.author.avatar || null
        }

        // Normalize author avatar URL
        if (comment.author?.avatar?.url && !comment.author.avatar.url.startsWith('http')) {
          comment.author.avatar.url = `${payloadBaseUrl}${comment.author.avatar.url}`
        }
        
        // Normalize post author avatar if present
        if (comment.post?.author?.avatar?.url && !comment.post.author.avatar.url.startsWith('http')) {
          comment.post.author.avatar.url = `${payloadBaseUrl}${comment.post.author.avatar.url}`
        }
        
        // Normalize parent field - PayloadCMS may return it as { id: number } when populated
        // Convert to just the ID number for consistency
        if (comment.parent && typeof comment.parent === 'object' && 'id' in comment.parent) {
          comment.parent = comment.parent.id
        }
        
        // console.log(`Comment ${comment.id}: parent =`, comment.parent, typeof comment.parent)
        
        return comment
      })
    }
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch comments from PayloadCMS',
      data: error.data
    })
  }
})

export interface CommentAuthor {
  id: number
  name: string
  email: string
  avatar: {
    id: number
    url: string
    alt: string
  } | null
  bio: string | null
}

export interface Comment {
  id: number
  post: {
    id: number
  }
  parent: number | null
  author: CommentAuthor
  mentions?: Array<{
    id: number
    name: string
    email: string
  }>
  content: {
    root: {
      type: string
      version: number
      children: Array<{
        type: string
        children?: Array<{
          type: string
          text?: string
        }>
        text?: string
      }>
    }
  }
  createdAt: string
  updatedAt: string
}

export interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[]
}

/**
 * Composable for managing comments
 */
export const useComments = () => {
  /**
   * Fetch comments for a post
   */
  const fetchComments = async (postId: number): Promise<Comment[]> => {
    try {
      const data = await $fetch<{ docs: Comment[] }>('/api/comments', {
        query: { postId: postId.toString() },
        credentials: 'include'
      })
      return data?.docs || []
    } catch (err) {
      console.error('Error fetching comments:', err)
      return []
    }
  }

  /**
   * Organize comments into a tree structure (comments with replies)
   */
  const organizeComments = (comments: Comment[]): CommentWithReplies[] => {
    // Separate top-level comments and replies
    const topLevel: Comment[] = []
    const repliesMap = new Map<number, Comment[]>()

    // console.log('Organizing comments:', comments.length, 'comments')
    
    comments.forEach(comment => {
      // Handle parent as number, null, undefined, or object { id: number }
      const parentId = typeof comment.parent === 'object' && comment.parent !== null 
        ? (comment.parent as any).id 
        : comment.parent
      
      // console.log(`Comment ${comment.id}: parentId =`, parentId, 'type:', typeof parentId)
      
      if (parentId === null || parentId === undefined) {
        topLevel.push(comment)
        console.log(`  -> Added to top level`)
      } else {
        const parentIdNum = typeof parentId === 'number' ? parentId : parseInt(String(parentId), 10)
        if (!repliesMap.has(parentIdNum)) {
          repliesMap.set(parentIdNum, [])
        }
        repliesMap.get(parentIdNum)!.push(comment)
        console.log(`  -> Added as reply to parent ${parentIdNum}`)
      }
    })

    console.log('Top level comments:', topLevel.length)
    console.log('Replies map:', Array.from(repliesMap.entries()).map(([k, v]) => `${k}: ${v.length}`))

    // Build tree structure
    const buildTree = (comment: Comment): CommentWithReplies => {
      const commentWithReplies: CommentWithReplies = { ...comment }
      const replies = repliesMap.get(comment.id) || []
      if (replies.length > 0) {
        commentWithReplies.replies = replies.map(buildTree)
        console.log(`Comment ${comment.id} has ${replies.length} replies`)
      }
      return commentWithReplies
    }

    const result = topLevel.map(buildTree)
    console.log('Final organized comments:', result.length)
    return result
  }

  /**
   * Create a new comment
   */
  const createComment = async (
    postId: number,
    content: any,
    parentId?: number | null
  ): Promise<Comment | null> => {
    try {
      const data = await $fetch<Comment>('/api/comments', {
        method: 'POST',
        body: {
          post: postId,
          parent: parentId || null,
          content
        },
        credentials: 'include'
      })
      return data || null
    } catch (err) {
      console.error('Error creating comment:', err)
      return null
    }
  }

  /**
   * Update an existing comment
   */
  const updateComment = async (
    commentId: number,
    content: any
  ): Promise<Comment | null> => {
    try {
      const data = await $fetch<Comment>(`/api/comments/${commentId}`, {
        method: 'PATCH',
        body: {
          content
        },
        credentials: 'include'
      })
      return data || null
    } catch (err) {
      console.error('Error updating comment:', err)
      return null
    }
  }

  /**
   * Delete a comment
   */
  const deleteComment = async (commentId: number): Promise<boolean> => {
    try {
      await $fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      return true
    } catch (err) {
      console.error('Error deleting comment:', err)
      return false
    }
  }

  /**
   * Extract text content from Lexical JSON structure
   * Preserves mentions as @Friendly Name
   */
  const extractTextFromContent = (content: Comment['content']): string => {
    if (!content?.root?.children) return ''
    
    const extractText = (children: Array<{ 
      type: string
      children?: Array<{ type: string; text?: string }>
      text?: string
      format?: string
    }>): string => {
      return children
        .map(child => {
          if (child.type === 'text' && child.text) {
            // Check if this is a mention (starts with @)
            if (child.text.startsWith('@')) {
              return child.text
            }
            return child.text
          }
          if (child.children) {
            return extractText(child.children)
          }
          return ''
        })
        .filter(Boolean)
        .join('')
    }
    
    return extractText(content.root.children)
  }

  /**
   * Extract username from email (removes @asburyseminary.edu)
   */
  const getUsernameFromEmail = (email: string): string => {
    if (!email) return ''
    return email.replace('@asburyseminary.edu', '').toLowerCase()
  }

  /**
   * Extract mentions from Lexical content for display
   * Returns HTML string with mentions styled and linked
   */
  const extractContentWithMentions = (content: Comment['content'], mentions?: Comment['mentions']): string => {
    if (!content?.root?.children) return ''
    
    // Create a map of mention names to usernames from the mentions array
    const mentionMap = new Map<string, string>()
    if (mentions && Array.isArray(mentions)) {
      mentions.forEach(mention => {
        const username = getUsernameFromEmail(mention.email)
        mentionMap.set(mention.name.toLowerCase(), username)
      })
    }
    
    const extractHTML = (children: Array<{ 
      type: string
      children?: Array<{ type: string; text?: string }>
      text?: string
      format?: string
    }>): string => {
      return children
        .map(child => {
          if (child.type === 'text' && child.text) {
            // Check if this is a mention (starts with @)
            if (child.text.startsWith('@')) {
              // Extract the name from @Name
              const mentionName = child.text.substring(1).trim()
              // Try to find username from mentions array, otherwise convert name to username format
              const username = mentionMap.get(mentionName.toLowerCase()) || 
                              mentionName.toLowerCase().replace(/\s+/g, '.')
              return `<a href="/user/${username}" class="text-blue-600 font-medium hover:text-blue-800 hover:underline">${child.text}</a>`
            }
            return child.text.replace(/\n/g, '<br>')
          }
          if (child.children) {
            return extractHTML(child.children)
          }
          return ''
        })
        .filter(Boolean)
        .join('')
    }
    
    return extractHTML(content.root.children)
  }

  return {
    fetchComments,
    organizeComments,
    createComment,
    updateComment,
    deleteComment,
    extractTextFromContent,
    extractContentWithMentions
  }
}

export interface MentionUser {
  id: number
  name: string
  email: string
  avatar: string | null
}

/**
 * Search for users by name (for mention autocomplete)
 */
export const useMentions = () => {
  const searchUsers = async (query: string): Promise<MentionUser[]> => {
    if (!query || query.trim().length === 0) {
      return []
    }

    try {
      const response = await $fetch<{ docs: MentionUser[] }>('/api/users/search', {
        query: {
          q: query.trim()
        }
      })

      return response.docs || []
    } catch (err) {
      console.error('Error searching users:', err)
      return []
    }
  }

  /**
   * Parse mentions from text (e.g., "@John Doe" -> { name: "John Doe" })
   * Returns array of mention objects
   */
  const parseMentionsFromText = (text: string): Array<{ name: string; startIndex: number; endIndex: number }> => {
    const mentions: Array<{ name: string; startIndex: number; endIndex: number }> = []
    const mentionRegex = /@([A-Za-z][A-Za-z0-9\s]*[A-Za-z0-9]|[A-Za-z])/g
    
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      const name = match[1].trim()
      if (name.length > 0) {
        mentions.push({
          name,
          startIndex: match.index,
          endIndex: match.index + match[0].length
        })
      }
    }
    
    return mentions
  }

  /**
   * Convert plain text with mentions to Lexical content structure
   * Mentions are stored as text nodes with @ prefix
   * Backend will parse and extract user IDs
   */
  const createLexicalContentWithMentions = (text: string) => {
    // Split text into segments (regular text and mentions)
    const segments: Array<{ type: 'text' | 'mention'; content: string }> = []
    const mentionRegex = /@([A-Za-z][A-Za-z0-9\s]*[A-Za-z0-9]|[A-Za-z])/g
    
    let lastIndex = 0
    let match
    
    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.substring(lastIndex, match.index)
        })
      }
      
      // Add mention
      segments.push({
        type: 'mention',
        content: match[0] // Full match including @
      })
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex)
      })
    }
    
    // If no mentions, just create simple text structure
    if (segments.length === 0) {
      return {
        root: {
          type: 'root',
          version: 1,
          children: [
            {
              type: 'paragraph',
              version: 1,
              children: [
                {
                  type: 'text',
                  text: text.trim(),
                  version: 1
                }
              ]
            }
          ]
        }
      }
    }
    
    // Build Lexical structure with text and mentions
    const children = segments.map(segment => {
      if (segment.type === 'mention') {
        // Store mention as text node - backend will parse @Friendly Name
        return {
          type: 'text',
          text: segment.content,
          version: 1,
          // We could add a format here to style mentions differently
          // format: 'mention'
        }
      } else {
        return {
          type: 'text',
          text: segment.content,
          version: 1
        }
      }
    }).filter(child => child.text.length > 0) // Remove empty text nodes
    
    return {
      root: {
        type: 'root',
        version: 1,
        children: [
          {
            type: 'paragraph',
            version: 1,
            children
          }
        ]
      }
    }
  }

  /**
   * Extract text from Lexical content, preserving mentions
   */
  const extractTextWithMentions = (content: any): string => {
    if (!content?.root?.children) return ''
    
    const extractText = (children: Array<{ 
      type: string
      children?: Array<{ type: string; text?: string }>
      text?: string
    }>): string => {
      return children
        .map(child => {
          if (child.type === 'text' && child.text) {
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

  return {
    searchUsers,
    parseMentionsFromText,
    createLexicalContentWithMentions,
    extractTextWithMentions
  }
}

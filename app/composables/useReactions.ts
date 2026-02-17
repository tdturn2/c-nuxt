export const useReactions = () => {
  const getReactions = async (postId: number | string) => {
    // PayloadCMS query format: where[field][equals]=value
    // Since post is a relation, we query by post ID
    return await $fetch(`/api/reactions`, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      query: {
        'where[post][equals]': postId.toString()
      }
    })
  }

  const createReaction = async (data: {
    post: number
    reactionType: string
  }) => {
    // User ID is determined server-side from session
    return await $fetch('/api/reactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: data
    })
  }

  const deleteReaction = async (reactionId: number | string) => {
    return await $fetch(`/api/reactions/${reactionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
  }

  const unreact = async (postId: number | string) => {
    return await $fetch(`/api/reactions/unreact/${postId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
  }

  const toggleReaction = async (postId: number, reactionType: string = 'like') => {
    try {
      // First, check if user already reacted
      const reactions: any = await getReactions(postId)
      // Note: We can't filter by userId here since we don't have it client-side
      // The server will handle ensuring only the authenticated user's reactions are returned
      const existingReaction = reactions?.docs?.find((r: any) => 
        r.reactionType === reactionType
      )

      if (existingReaction) {
        // Delete existing reaction
        await deleteReaction(existingReaction.id)
        return { action: 'removed', reaction: null }
      } else {
        // Create new reaction (user ID determined server-side from session)
        const reaction = await createReaction({
          post: postId,
          reactionType
        })
        return { action: 'added', reaction }
      }
    } catch (error) {
      console.error('Error toggling reaction:', error)
      throw error
    }
  }

  return {
    getReactions,
    createReaction,
    deleteReaction,
    toggleReaction,
    unreact
  }
}

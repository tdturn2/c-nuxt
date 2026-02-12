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
    user: number
    reactionType: string
  }) => {
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

  const toggleReaction = async (postId: number, userId: number, reactionType: string = 'like') => {
    try {
      // First, check if user already reacted
      const reactions: any = await getReactions(postId)
      const existingReaction = reactions?.docs?.find((r: any) => 
        r.user?.id === userId && r.reactionType === reactionType
      )

      if (existingReaction) {
        // Delete existing reaction
        await deleteReaction(existingReaction.id)
        return { action: 'removed', reaction: null }
      } else {
        // Create new reaction
        const reaction = await createReaction({
          post: postId,
          user: userId,
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

export type PostReaction = {
  id: number | string
  user: {
    id: number
    name: string
    avatar?: { url: string } | null
  }
  reactionType: string
  createdAt: string
}

const reactionLoadGeneration = new Map<string, number>()

export function bumpReactionLoadGeneration(postId: number | string) {
  const key = String(postId)
  const next = (reactionLoadGeneration.get(key) ?? 0) + 1
  reactionLoadGeneration.set(key, next)
  return next
}

export function getReactionLoadGeneration(postId: number | string) {
  return reactionLoadGeneration.get(String(postId)) ?? 0
}

export function useSharedPostReactions(postId: MaybeRefOrGetter<number | string>) {
  const store = useState<Record<string, PostReaction[]>>('connect-post-reactions', () => ({}))
  const key = computed(() => String(toValue(postId)))

  const reactions = computed({
    get: () => store.value[key.value] ?? [],
    set: (list: PostReaction[]) => {
      store.value = { ...store.value, [key.value]: list }
    },
  })

  const hasLoaded = computed(() => Object.prototype.hasOwnProperty.call(store.value, key.value))

  return { reactions, hasLoaded }
}

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

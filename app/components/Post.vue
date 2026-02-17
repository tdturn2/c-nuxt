<template>
  <article class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
    <!-- Post Header -->
    <div class="p-4 flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          :alt="displayUser.name"
          class="w-full h-full object-cover"
        />
        <span v-else class="text-gray-600 font-semibold text-sm">
          {{ displayUser.name.charAt(0).toUpperCase() }}
        </span>
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-gray-900">{{ displayUser.name }}</h3>
        <p class="text-xs text-gray-500">{{ formatDate(post.createdAt) }}</p>
      </div>
    </div>

    <!-- Post Content -->
    <div v-if="postContent || youtubeEmbeds.length > 0" class="px-4 pb-4">
      <div 
        class="text-gray-900 whitespace-pre-wrap"
        :style="!isExpanded && shouldTruncate ? 'display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;' : ''"
      >
        <div v-html="formattedContent"></div>
      </div>
      <div v-if="youtubeEmbeds.length > 0" class="mt-4 space-y-4">
        <div
          v-for="(embed, index) in youtubeEmbeds"
          :key="index"
          class="aspect-video w-full rounded-lg overflow-hidden"
        >
          <iframe
            :src="embed"
            class="w-full h-full block"
            style="border: none; border-radius: 0.5rem;"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </div>
      <button
        v-if="shouldTruncate"
        @click="isExpanded = !isExpanded"
        class="mt-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        {{ isExpanded ? 'Show less' : 'Show more' }}
      </button>
    </div>

    <!-- Post Images -->
    <div v-if="post.images && post.images.length > 0" class="px-4 pb-4">
      <div v-if="post.images.length === 1 && post.images[0]?.image" class="rounded-xl overflow-hidden">
        <img
          :src="post.images[0].image.url"
          :alt="post.images[0].image.alt || 'Post image'"
          class="w-full h-auto object-cover"
        />
      </div>
      <div v-else class="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
        <template v-for="(img, index) in post.images" :key="img.id">
          <img
            v-if="img.image"
            :src="img.image.url"
            :alt="img.image.alt || `Post image ${index + 1}`"
            class="w-full h-48 object-cover"
          />
        </template>
      </div>
    </div>

    <!-- Post Actions -->
    <div class="border-t border-gray-200 px-4 py-3">
      <div class="flex items-center gap-6">
        <!-- Reaction Button with Picker -->
        <UPopover :open="showReactionPicker" @update:open="showReactionPicker = $event" :popper="{ placement: 'top' }">
          <template #default="{ open }">
            <UButton
              :disabled="togglingReaction || !currentUserId"
              variant="ghost"
              color="neutral"
              :class="[
                'flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                userReaction ? getReactionConfig(userReaction).color : '!text-gray-600 hover:!text-gray-900'
              ]"
            >
              <span class="text-xl" :class="userReaction ? '' : 'opacity-60'">
                {{ userReaction ? getReactionConfig(userReaction).emoji : '👍' }}
              </span>
              <span class="text-sm font-medium">
                {{ userReaction ? getReactionConfig(userReaction).label : 'Like' }}
              </span>
            </UButton>
          </template>
          
          <template #content>
            <div class="p-2 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col gap-2">
              <div class="flex items-center gap-1">
                <button
                  v-for="(config, type) in reactionConfig"
                  :key="type"
                  @click.stop="handleReactionClick(type as ReactionType)"
                  :disabled="togglingReaction || !currentUserId"
                  class="p-2 hover:scale-125 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  :title="config.label"
                  :class="userReaction === type ? 'ring-2 ring-blue-500 rounded-full' : ''"
                >
                  <span class="text-2xl">{{ config.emoji }}</span>
                </button>
              </div>
              <button
                v-if="userReaction"
                @click.stop="handleRemoveReaction"
                :disabled="togglingReaction || !currentUserId"
                class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                title="Remove reaction"
              >
                <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </template>
        </UPopover>
        
        <button 
          @click="showComments = !showComments"
          class="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <UIcon name="i-heroicons-chat-bubble-left-right" class="w-5 h-5" />
          <span class="text-sm font-medium">Comment</span>
          <span v-if="commentCount > 0" class="text-xs text-gray-500">({{ commentCount }})</span>
        </button>
      </div>
      
      <!-- Reaction Summary -->
      <div v-if="reactions.length > 0" class="mt-3 flex items-center gap-2">
        <!-- Reaction Type Icons -->
        <div class="flex items-center gap-1">
          <template v-for="(count, type) in reactionCountsByType" :key="type">
            <span v-if="count > 0" class="text-sm" :title="`${count} ${getReactionConfig(type).label}`">
              {{ getReactionConfig(type).emoji }}
            </span>
          </template>
        </div>
        
        <!-- Reaction Count -->
        <span class="text-xs text-gray-600 font-medium">
          {{ reactionCount }}
        </span>
        
        <!-- Reaction Avatars -->
        <div class="flex -space-x-2 ml-2">
          <template v-for="(reaction, index) in reactions.slice(0, 5)" :key="reaction.id">
            <img
              v-if="reaction.user?.avatar?.url"
              :src="reaction.user.avatar.url"
              :alt="reaction.user.name"
              class="w-6 h-6 rounded-full border-2 border-white object-cover"
              :title="`${reaction.user.name} reacted with ${getReactionConfig(reaction.reactionType).label}`"
            />
            <div
              v-else
              class="w-6 h-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600"
              :title="`${reaction.user.name} reacted with ${getReactionConfig(reaction.reactionType).label}`"
            >
              {{ reaction.user?.name?.charAt(0)?.toUpperCase() || '?' }}
            </div>
          </template>
        </div>
      </div>

      <!-- Comments Section -->
      <div v-if="showComments" class="border-t border-gray-200 px-4 py-4 mt-3">
        <!-- Comment Form -->
        <div v-if="currentUserId" class="mb-4 relative">
          <textarea
            ref="commentTextareaRef"
            v-model="newCommentText"
            @input="handleCommentInput"
            @keydown="handleCommentKeydown"
            placeholder="Write a comment... Use @ to mention someone"
            rows="3"
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <MentionAutocomplete
            :is-visible="showMentionAutocomplete"
            :users="mentionUsers"
            :selected-index="mentionSelectedIndex"
            :position="mentionPosition"
            @select="handleMentionSelect"
            @update-selected-index="mentionSelectedIndex = $event"
          />
          <div class="flex items-center justify-end gap-2 mt-2">
            <button
              @click="submitComment"
              :disabled="!newCommentText.trim() || submittingComment"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ submittingComment ? 'Posting...' : 'Post Comment' }}
            </button>
          </div>
        </div>

        <!-- Comments List -->
        <div v-if="loadingComments" class="text-center py-4 text-gray-500 text-sm">
          Loading comments...
        </div>
        <div v-else-if="organizedComments.length > 0" class="space-y-4">
          <Comment
            v-for="comment in organizedComments"
            :key="comment.id"
            :comment="comment"
            :post-id="post.id"
            :current-user-id="currentUserId"
            @reply-created="handleReplyCreated"
            @comment-updated="handleCommentUpdated"
            @comment-deleted="handleCommentDeleted"
          />
        </div>
        <div v-else class="text-center py-4 text-gray-500 text-sm">
          No comments yet. Be the first to comment!
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
interface Author {
  id: number
  name: string
  avatar: string | null
  bio: string
  email: string
}

interface User {
  id: number
  name: string
  avatar: {
    id: number
    url: string
    alt: string
  } | null
  bio: string
  email: string
}

interface Image {
  id: string
  image: {
    id: number
    url: string
    alt: string
    width: number
    height: number
  }
}

interface Reaction {
  id: number
  user: {
    id: number
    name: string
    avatar?: {
      url: string
    } | null
  }
  reactionType: string
  createdAt: string
}

interface Post {
  id: number
  author: Author
  content: {
    root: {
      children: Array<{
        type: string
        children?: Array<{
          type: string
          text?: string
        }>
      }>
    }
  }
  images: Image[]
  createdAt: string
  updatedAt: string
}

const props = defineProps<{
  post: Post
  user: User | null
  currentUserId?: number
}>()

const { toggleReaction, getReactions, createReaction, deleteReaction, unreact } = useReactions()
const { fetchComments, organizeComments, createComment, extractTextFromContent, updateComment } = useComments()
const { searchUsers, createLexicalContentWithMentions } = useMentions()

const reactions = ref<Reaction[]>([])
const togglingReaction = ref(false)
const showReactionPicker = ref(false)

// Comments state
const showComments = ref(false)
const comments = ref<any[]>([])
const loadingComments = ref(false)
const newCommentText = ref('')
const submittingComment = ref(false)

// Mention autocomplete state
const commentTextareaRef = ref<HTMLTextAreaElement | null>(null)
const showMentionAutocomplete = ref(false)
const mentionUsers = ref<Array<{ id: number; name: string; email: string; avatar: string | null }>>([])
const mentionSelectedIndex = ref(0)
const mentionPosition = ref({ top: 0, left: 0 })
const mentionQuery = ref('')
const mentionStartIndex = ref(-1)

// Reaction types
type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'pray'

// Reaction configuration
const reactionConfig: Record<ReactionType, { emoji: string; label: string; color: string }> = {
  like: { emoji: '👍', label: 'Like', color: 'text-blue-600' },
  love: { emoji: '❤️', label: 'Love', color: 'text-red-600' },
  laugh: { emoji: '😂', label: 'Haha', color: 'text-yellow-600' },
  wow: { emoji: '😮', label: 'Wow', color: 'text-yellow-600' },
  sad: { emoji: '😢', label: 'Sad', color: 'text-yellow-600' },
  pray: { emoji: '🙏', label: 'Praying', color: 'text-purple-600' }
}

// Helper to safely get reaction config
const getReactionConfig = (type: string | null): { emoji: string; label: string; color: string } => {
  if (!type || !(type in reactionConfig)) {
    return reactionConfig.like
  }
  return reactionConfig[type as ReactionType]
}

// Fetch reactions for this post
const loadReactions = async () => {
  try {
    //console.log('Loading reactions for post:', props.post.id)
    const response: any = await getReactions(props.post.id)
    //console.log('Reactions response for post', props.post.id, ':', response)
    reactions.value = response?.docs || []
    //console.log('Set reactions to:', reactions.value)
  } catch (error) {
    console.error('Error loading reactions:', error)
  }
}

// Load reactions and comments on mount
onMounted(() => {
  if (import.meta.client) {
    loadReactions()
    loadComments() // Load comments on mount so count is available immediately
  }
})

// Watch for comments section to open and reload comments if needed
watch(showComments, async (isOpen) => {
  if (isOpen && comments.value.length === 0) {
    await loadComments()
  }
})

// Load comments
const loadComments = async () => {
  loadingComments.value = true
  try {
    console.log('Loading comments for post:', props.post.id)
    const fetchedComments = await fetchComments(props.post.id)
    console.log('Fetched comments:', fetchedComments)
    
    // Ensure we have fresh data by replacing the entire array
    // This ensures reactivity works properly
    await nextTick()
    comments.value = [...fetchedComments]
    console.log('Set comments.value to:', comments.value.length, 'comments')
  } catch (error) {
    console.error('Error loading comments:', error)
  } finally {
    loadingComments.value = false
  }
}

// Organize comments into tree structure
const organizedComments = computed(() => {
  // Force reactivity by creating a new array reference
  const organized = organizeComments(comments.value)
  console.log('Organized comments computed:', organized.length, 'top-level comments')
  return organized
})

// Comment count
const commentCount = computed(() => {
  return comments.value.length
})

// Handle comment input for mention detection
const handleCommentInput = async (e?: Event) => {
  const textarea = commentTextareaRef.value
  if (!textarea) return

  // Use setTimeout to ensure cursor position is updated
  await nextTick()
  
  const text = newCommentText.value
  const cursorPos = textarea.selectionStart || text.length
  
  console.log('Input detected, cursor pos:', cursorPos, 'text:', text)
  
  // Find @ symbol before cursor
  const textBeforeCursor = text.substring(0, cursorPos)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  
  console.log('Last @ index:', lastAtIndex)
  
  if (lastAtIndex !== -1) {
    // Check if there's a space after @ (meaning mention is complete or invalid)
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
    const spaceIndex = textAfterAt.indexOf(' ')
    
    console.log('Text after @:', textAfterAt, 'space index:', spaceIndex)
    
    // Only show autocomplete if we're actively typing a mention (no space yet)
    if (spaceIndex === -1) {
      // We're in a mention - extract query (everything after @ until cursor)
      const query = textAfterAt.trim()
      
      console.log('Mention query:', query, 'length:', query.length)
      
      // Show autocomplete even if query is empty (just typed @)
      // or if there's a query to search
      mentionQuery.value = query
      mentionStartIndex.value = lastAtIndex
      
      // Search for users (empty query will return empty array, but we can show all users)
      console.log('Searching users for:', query || '(empty - showing all)')
      const users = query.length > 0 
        ? await searchUsers(query)
        : await searchUsers('') // Search with empty string to get some users
      
      console.log('Found users:', users.length, users)
      mentionUsers.value = users
      
      // Calculate position for autocomplete dropdown - simpler approach
      const textareaRect = textarea.getBoundingClientRect()
      
      // Position dropdown below the textarea, aligned to left
      mentionPosition.value = {
        top: textareaRect.bottom + 5,
        left: textareaRect.left + 10
      }
      
      console.log('Autocomplete position:', mentionPosition.value, 'visible:', users.length > 0)
      
      showMentionAutocomplete.value = users.length > 0
      mentionSelectedIndex.value = 0
    } else {
      // Space found after @, mention is complete
      console.log('Space found, hiding autocomplete')
      showMentionAutocomplete.value = false
    }
  } else {
    // No @ found
    showMentionAutocomplete.value = false
  }
}

// Handle keyboard navigation in mention autocomplete
const handleCommentKeydown = (e: KeyboardEvent) => {
  if (showMentionAutocomplete.value && mentionUsers.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionSelectedIndex.value = Math.min(mentionSelectedIndex.value + 1, mentionUsers.value.length - 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionSelectedIndex.value = Math.max(mentionSelectedIndex.value - 1, 0)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const selectedUser = mentionUsers.value[mentionSelectedIndex.value]
      if (selectedUser) {
        handleMentionSelect(selectedUser)
      }
    } else if (e.key === 'Escape') {
      showMentionAutocomplete.value = false
    }
  }
}

// Handle mention selection
const handleMentionSelect = (user: { id: number; name: string; email: string; avatar: string | null }) => {
  const textarea = commentTextareaRef.value
  if (!textarea || mentionStartIndex.value === -1) return

  const text = newCommentText.value
  const textBeforeMention = text.substring(0, mentionStartIndex.value)
  const textAfterMention = text.substring(textarea.selectionStart)
  
  // Insert mention as "@Friendly Name "
  newCommentText.value = textBeforeMention + `@${user.name} ` + textAfterMention
  
  // Move cursor after the mention
  const newCursorPos = textBeforeMention.length + user.name.length + 2 // +2 for @ and space
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  }, 0)
  
  showMentionAutocomplete.value = false
  mentionStartIndex.value = -1
}

// Submit new comment
const submitComment = async () => {
  if (!newCommentText.value.trim() || submittingComment.value || !props.currentUserId) return

  submittingComment.value = true
  try {
    // Create Lexical content structure with mentions
    const content = createLexicalContentWithMentions(newCommentText.value.trim())

    const newComment = await createComment(props.post.id, content)
    
    if (newComment) {
      newCommentText.value = ''
      
      // Ensure comments section is visible
      if (!showComments.value) {
        showComments.value = true
      }
      
      // Normalize parent field if it's an object
      if (newComment.parent && typeof newComment.parent === 'object' && newComment.parent !== null && 'id' in newComment.parent) {
        newComment.parent = (newComment.parent as any).id
      }
      
      // Add the new comment to the list immediately
      // Don't reload immediately - we already have the comment data from the create response
      comments.value = [...comments.value, newComment]
      
      // Silently sync in the background after a delay, but preserve the new comment
      // This ensures we have the latest data without removing the comment
      setTimeout(async () => {
        try {
          const fetchedComments = await fetchComments(props.post.id)
          const newCommentId = newComment.id
          
          // Check if our new comment is in the fetched list
          const commentExists = fetchedComments.some(c => c.id === newCommentId)
          
          if (commentExists) {
            // Comment is now in PayloadCMS, use the fetched version
            comments.value = fetchedComments
          } else {
            // Comment not indexed yet, merge fetched with our new comment
            const fetchedIds = new Set(fetchedComments.map(c => c.id))
            const commentsToKeep = comments.value.filter(c => !fetchedIds.has(c.id))
            comments.value = [...fetchedComments, ...commentsToKeep]
          }
        } catch (error) {
          // If fetch fails, keep the optimistic comment
          console.error('Background sync failed, keeping optimistic comment:', error)
        }
      }, 2000)
    }
  } catch (error) {
    console.error('Error submitting comment:', error)
  } finally {
    submittingComment.value = false
  }
}

// Handle reply created
const handleReplyCreated = async () => {
  // Reload comments to get the new reply
  await loadComments()
}

// Handle comment updated
const handleCommentUpdated = async (updatedComment?: CommentWithReplies) => {
  console.log('Comment updated event received', updatedComment)
  
  // If we have the updated comment, update it in the array immediately
  if (updatedComment) {
    const index = comments.value.findIndex(c => c.id === updatedComment.id)
    if (index !== -1) {
      // Update the comment in place - create new object to ensure reactivity
      comments.value[index] = { ...comments.value[index], ...updatedComment }
      console.log('Updated comment in array at index:', index)
      
      // Force reactivity by replacing the entire array
      comments.value = [...comments.value]
    }
  }
  
  // Don't reload immediately - the local update is already applied
  // Only reload if user navigates away or after a longer delay
  // This prevents the reload from overwriting our local update
  // The update will persist when the page is refreshed or comments are reloaded naturally
}

// Handle comment deleted
const handleCommentDeleted = async (commentId?: number) => {
  console.log('Comment deleted event received', commentId)
  
  // Remove the comment from the array immediately
  if (commentId) {
    const index = comments.value.findIndex(c => c.id === commentId)
    if (index !== -1) {
      comments.value.splice(index, 1)
      // Force reactivity by replacing the array
      comments.value = [...comments.value]
      console.log('Removed comment from array:', commentId)
    }
    
    // Also check nested replies
    const removeFromReplies = (commentList: CommentWithReplies[]): CommentWithReplies[] => {
      return commentList
        .filter(c => c.id !== commentId)
        .map(c => {
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: removeFromReplies(c.replies)
            }
          }
          return c
        })
    }
    
    // Update organized comments structure
    const organized = organizeComments(comments.value)
    // Force reactivity
    comments.value = [...comments.value]
  }
  
  // Don't reload immediately - the local removal is already applied
  // The deletion will persist when the page is refreshed
}

const reactionCount = computed(() => reactions.value.length)

// Get user's current reaction
const userReaction = computed(() => {
  if (!props.currentUserId) return null
  const foundReaction = reactions.value.find(r => r.user?.id === props.currentUserId)
  return foundReaction?.reactionType ?? null
})

// Group reactions by type
const reactionCountsByType = computed(() => {
  const counts: Record<string, number> = {}
  reactions.value.forEach(reaction => {
    const type = reaction.reactionType || 'like'
    counts[type] = (counts[type] || 0) + 1
  })
  return counts
})

const handleReactionClick = async (reactionType: ReactionType) => {
  if (!props.currentUserId || togglingReaction.value) {
    if (!props.currentUserId) {
      console.warn('Cannot react: No current user ID provided')
    }
    return
  }
  
  // Close popover immediately
  showReactionPicker.value = false
  
  togglingReaction.value = true
  
  try {
    // Find current user's reaction
    const currentUserReaction = reactions.value.find(r => r.user?.id === props.currentUserId)
    
    if (currentUserReaction) {
      if (currentUserReaction.reactionType === reactionType) {
        // Remove reaction if clicking the same type - use unreact endpoint
        try {
          await unreact(props.post.id)
        } catch (error: any) {
          // Handle 403/401 errors gracefully - if we can't delete, just reload
          if (error?.statusCode === 403 || error?.statusCode === 401 || error?.status === 403 || error?.status === 401) {
            console.warn('Permission denied: Cannot delete reaction')
            await loadReactions()
            return
          }
          throw error
        }
      } else {
        // Replace reaction with new type
        // First remove the old one using unreact endpoint
        try {
          await unreact(props.post.id)
        } catch (error: any) {
          // Handle 403/401 errors gracefully - if we can't delete, try to add new one anyway
          if (error?.statusCode === 403 || error?.statusCode === 401 || error?.status === 403 || error?.status === 401) {
            console.warn('Permission denied: Cannot delete old reaction, will try to add new one')
          } else {
            throw error
          }
        }
        // Then add the new one
        await createReaction({
          post: props.post.id,
          reactionType
        })
      }
    } else {
      // Add new reaction
      await createReaction({
        post: props.post.id,
        reactionType
      })
    }
    
    // Reload reactions to get updated list
    await loadReactions()
  } catch (error) {
    console.error('Error toggling reaction:', error)
  } finally {
    togglingReaction.value = false
  }
}

const handleRemoveReaction = async () => {
  if (!props.currentUserId || togglingReaction.value) {
    return
  }
  
  // Close popover immediately
  showReactionPicker.value = false
  
  togglingReaction.value = true
  
  try {
    // Find current user's reaction
    const currentUserReaction = reactions.value.find(r => r.user?.id === props.currentUserId)
    
    if (currentUserReaction) {
      try {
        // Remove reaction using unreact endpoint (includes email for SSO auth)
        await unreact(props.post.id)
        // Reload reactions to get updated list
        await loadReactions()
      } catch (error: any) {
        // Handle 403/401 errors gracefully
        if (error?.statusCode === 403 || error?.statusCode === 401 || error?.status === 403 || error?.status === 401) {
          console.warn('Permission denied: Cannot delete reaction. You may not have permission or the reaction may not belong to you.')
          // Still reload to get current state
          await loadReactions()
        } else {
          throw error
        }
      }
    }
  } catch (error) {
    console.error('Error removing reaction:', error)
  } finally {
    togglingReaction.value = false
  }
}

const displayUser = computed(() => props.user || props.post.author)

const avatarUrl = computed(() => {
  // Use user avatar if available
  if (props.user?.avatar) {
    // Handle avatar as object with url property
    if (props.user.avatar && typeof props.user.avatar === 'object' && 'url' in props.user.avatar) {
      const url = props.user.avatar.url
      if (typeof url === 'string' && url) {
        return url
      }
    }
    // Handle avatar as string (legacy)
    if (typeof props.user.avatar === 'string') {
      return props.user.avatar
    }
  }
  // Fallback to author avatar (legacy format - string)
  if (props.post.author?.avatar && typeof props.post.author.avatar === 'string') {
    return props.post.author.avatar
  }
  return null
})

const isExpanded = ref(false)

const shouldTruncate = computed(() => {
  if (!postContent.value) return false
  // Check if content has multiple lines or is long enough to need truncation
  const lines = postContent.value.split('\n')
  return lines.length > 3 || postContent.value.length > 200
})

// Extract YouTube URLs from Lexical content
const extractYouTubeLinks = (children: any[]): string[] => {
  const links: string[] = []
  
  children.forEach(child => {
    if (child.type === 'autolink' && child.fields?.url) {
      const url = child.fields.url
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        links.push(url)
      }
    }
    if (child.children) {
      links.push(...extractYouTubeLinks(child.children))
    }
  })
  
  return links
}

// Extract text content from Lexical JSON structure
const postContent = computed(() => {
  if (!props.post.content?.root?.children) return ''
  
  const extractText = (children: Array<{ 
    type: string
    children?: Array<{ type: string; text?: string }>
    fields?: { url?: string }
  }>): string => {
    return children
      .map(child => {
        // Skip autolink nodes (we'll handle YouTube separately)
        if (child.type === 'autolink') {
          return ''
        }
        if (child.type === 'text' && 'text' in child) {
          return (child as any).text || ''
        }
        if (child.children) {
          return extractText(child.children as any)
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  
  return extractText(props.post.content.root.children)
})

const youtubeLinks = computed(() => {
  if (!props.post.content?.root?.children) return []
  return extractYouTubeLinks(props.post.content.root.children)
})

const youtubeEmbeds = computed(() => {
  return youtubeLinks.value.map(url => {
    // Convert YouTube URL to embed format
    let videoId = ''
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || ''
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`
    }
    return null
  }).filter(Boolean) as string[]
})

const formattedContent = computed(() => {
  if (!postContent.value) return ''
  // Escape HTML and preserve line breaks
  return postContent.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }
}
</script>

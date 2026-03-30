<template>
  <div class="comment" :class="{ 'ml-8': isReply }">
    <div class="flex gap-2.5">
      <!-- Avatar -->
      <div class="shrink-0">
        <NuxtLink
          :to="`/user/${getUsernameFromEmail(comment.author.email)}`"
          class="flex w-8 h-8 rounded-full bg-gray-300 items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
        >
          <img
            v-if="comment.author.avatar?.url"
            :src="comment.author.avatar.url"
            :alt="comment.author.name"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-gray-600 font-semibold text-xs">
            {{ comment.author.name.charAt(0).toUpperCase() }}
          </span>
        </NuxtLink>
      </div>

      <!-- Comment Content -->
      <div class="flex-1 min-w-0">
        <div class="bg-gray-50 rounded-lg px-3 py-2">
          <!-- Author and Date -->
          <div class="flex items-center justify-between mb-0.5">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm text-gray-900">{{ comment.author.name }}</span>
              <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
            </div>
            
            <!-- Edit/Delete Links (only for own comments) -->
            <div v-if="isOwnComment && !isEditing" class="flex items-center gap-2">
              <a
                href="#"
                @click.prevent="startEdit"
                class="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                Edit
              </a>
              <a
                href="#"
                @click.prevent="showDeleteConfirm = true"
                class="text-xs text-red-600 hover:text-red-800 hover:underline font-medium"
              >
                Delete
              </a>
            </div>
          </div>

          <!-- Comment Text (display mode) -->
          <div v-if="!isEditing" class="text-sm text-gray-900 whitespace-pre-wrap" v-html="commentTextHTML"></div>

          <!-- Edit Form -->
          <div v-else class="space-y-2">
            <textarea
              v-model="editText"
              rows="3"
              class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div class="flex items-center gap-2">
              <button
                @click="saveEdit"
                :disabled="!editText.trim() || submitting"
                class="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ submitting ? 'Saving...' : 'Save' }}
              </button>
              <button
                @click="cancelEdit"
                class="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Reply Button (only show if not already a reply and not editing) -->
        <div v-if="!isReply && !showReplyForm && !isEditing" class="mt-1.5">
          <button
            @click="showReplyForm = true"
            class="text-xs text-gray-600 hover:text-gray-900 font-medium"
          >
            Reply
          </button>
        </div>

        <!-- Reply Form -->
        <div v-if="showReplyForm" class="mt-2">
          <textarea
            v-model="replyText"
            placeholder="Write a reply..."
            rows="2"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div class="flex items-center gap-2 mt-1.5">
            <button
              @click="submitReply"
              :disabled="!replyText.trim() || submitting"
              class="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ submitting ? 'Posting...' : 'Post Reply' }}
            </button>
            <button
              @click="cancelReply"
              class="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Replies -->
        <div v-if="comment.replies && comment.replies.length > 0" class="mt-2 space-y-2.5">
          <Comment
            v-for="reply in comment.replies"
            :key="reply.id"
            :comment="reply"
            :is-reply="true"
            :post-id="postId"
            :current-user-id="currentUserId"
            @reply-created="handleReplyCreated"
            @comment-updated="(comment) => emit('commentUpdated', comment)"
            @comment-deleted="(commentId) => emit('commentDeleted', commentId)"
          />
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="showDeleteConfirm = false">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-2">Delete Comment?</h3>
        <p class="text-sm text-gray-600 mb-4">Are you sure you want to delete this comment? This action cannot be undone.</p>
        <div class="flex items-center justify-end gap-2">
          <button
            @click="showDeleteConfirm = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            :disabled="isDeleting"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CommentWithReplies } from '~/composables/useComments'
import { useComments } from '~/composables/useComments'

interface Props {
  comment: CommentWithReplies
  isReply?: boolean
  postId: number
  currentUserId?: number
}

const props = withDefaults(defineProps<Props>(), {
  isReply: false
})

const emit = defineEmits<{
  replyCreated: [comment: CommentWithReplies]
  commentUpdated: [comment: CommentWithReplies]
  commentDeleted: [commentId: number]
}>()

const { extractTextFromContent, extractContentWithMentions, createComment, updateComment, deleteComment } = useComments()
const showReplyForm = ref(false)
const replyText = ref('')
const submitting = ref(false)
const isEditing = ref(false)
const editText = ref('')
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)

// Check if this comment belongs to the current user
const isOwnComment = computed(() => {
  return props.currentUserId !== undefined && 
         props.comment.author.id === props.currentUserId
})

const commentText = computed(() => {
  return extractTextFromContent(props.comment.content)
})

const commentTextHTML = computed(() => {
  return extractContentWithMentions(props.comment.content, props.comment.mentions)
})

// Helper function to extract username from email
const getUsernameFromEmail = (email: string): string => {
  if (!email) return ''
  return email.replace('@asburyseminary.edu', '').toLowerCase()
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

const submitReply = async () => {
  if (!replyText.value.trim() || submitting.value) return

  submitting.value = true
  try {
    // Create Lexical content structure for the reply
    const content = {
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
                text: replyText.value.trim(),
                version: 1
              }
            ]
          }
        ]
      }
    }

    const newReply = await createComment(props.postId, content, props.comment.id)
    
    if (newReply) {
      replyText.value = ''
      showReplyForm.value = false
      emit('replyCreated', newReply as CommentWithReplies)
    }
  } catch (error) {
    console.error('Error submitting reply:', error)
  } finally {
    submitting.value = false
  }
}

const cancelReply = () => {
  replyText.value = ''
  showReplyForm.value = false
}

const handleReplyCreated = (reply: CommentWithReplies) => {
  emit('replyCreated', reply)
}

const startEdit = () => {
  editText.value = commentText.value
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editText.value = ''
}

const saveEdit = async () => {
  if (!editText.value.trim() || submitting.value) return

  submitting.value = true
  try {
    // Create Lexical content structure
    const content = {
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
                text: editText.value.trim(),
                version: 1
              }
            ]
          }
        ]
      }
    }

    const updatedComment = await updateComment(props.comment.id, content)
    
    if (updatedComment) {
      console.log('Comment updated successfully:', updatedComment)
      
      // Normalize parent field if needed
      if (updatedComment.parent && typeof updatedComment.parent === 'object' && updatedComment.parent !== null && 'id' in updatedComment.parent) {
        updatedComment.parent = (updatedComment.parent as any).id
      }
      
      // Create updated comment object
      const updated: CommentWithReplies = {
        ...props.comment,
        content: updatedComment.content,
        updatedAt: updatedComment.updatedAt
      }
      
      isEditing.value = false
      editText.value = ''
      
      // Emit the updated comment so parent can update it in the array
      emit('commentUpdated', updated)
    } else {
      console.error('Failed to update comment - no data returned')
    }
  } catch (error) {
    console.error('Error updating comment:', error)
  } finally {
    submitting.value = false
  }
}

const confirmDelete = async () => {
  if (isDeleting.value) return

  isDeleting.value = true
  try {
    const success = await deleteComment(props.comment.id)
    
    if (success) {
      showDeleteConfirm.value = false
      // Emit the comment ID so parent can remove it immediately
      emit('commentDeleted', props.comment.id)
    }
  } catch (error) {
    console.error('Error deleting comment:', error)
  } finally {
    isDeleting.value = false
  }
}
</script>

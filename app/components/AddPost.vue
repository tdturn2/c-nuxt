<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Create a Post</h2>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <!-- <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
          What's on your mind?
        </label> -->
        <div class="relative">
          <textarea
            ref="contentTextareaRef"
            id="content"
            v-model="form.content"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,1)] focus:border-transparent placeholder:text-gray-600 text-gray-900"
            placeholder="Share your thoughts..."
            @input="handleInput"
            @keydown="handleKeydown"
            required
          ></textarea>
          
          <!-- Mention Autocomplete -->
          <MentionAutocomplete
            :is-visible="showMentionAutocomplete"
            :users="mentionUsers"
            :selected-index="mentionSelectedIndex"
            :position="mentionPosition"
            @select="handleMentionSelect"
          />
        </div>
      </div>

      <!-- <div>
        <label for="categories" class="block text-sm font-medium text-gray-700 mb-2">
          Category (optional)
        </label>
        <select
          id="categories"
          v-model="form.category"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,1)] focus:border-transparent"
        >
          <option value="">None</option>
          <option value="official">Official</option>
          <option value="community">Community</option>
        </select>
      </div> -->

      <div v-if="error" class="text-sm text-red-600">
        {{ error }}
      </div>

      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          @click="resetForm"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(13,94,130,1)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="submitting"
          class="px-4 py-2 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(13,94,130,1)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="submitting">Posting...</span>
          <span v-else>Post</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const { status } = useAuth()
const { searchUsers, createLexicalContentWithMentions } = useMentions()

const emit = defineEmits<{
  postCreated: []
}>()

const props = defineProps<{
  defaultAudience?: 'general' | 'students' | 'employees' | 'staff' | 'faculty'
}>()

const form = ref({
  content: '',
  category: ''
})

const submitting = ref(false)
const error = ref<string | null>(null)

// Mention autocomplete state
const contentTextareaRef = ref<HTMLTextAreaElement | null>(null)
const mentionQuery = ref('')
const mentionStartIndex = ref(-1)
const mentionUsers = ref<Array<{ id: number; name: string; email: string; avatar: string | null }>>([])
const mentionSelectedIndex = ref(0)
const mentionPosition = ref({ top: 0, left: 0 })
const showMentionAutocomplete = ref(false)

// Handle input for mention detection
const handleInput = async (e?: Event) => {
  const textarea = contentTextareaRef.value
  if (!textarea) return

  await nextTick()
  
  const text = form.value.content
  const cursorPos = textarea.selectionStart || text.length
  
  // Find @ symbol before cursor
  const textBeforeCursor = text.substring(0, cursorPos)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  
  if (lastAtIndex !== -1) {
    // Check if there's a space after @ (meaning mention is complete or invalid)
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
    const spaceIndex = textAfterAt.indexOf(' ')
    
    // Only show autocomplete if we're actively typing a mention (no space yet)
    if (spaceIndex === -1) {
      // We're in a mention - extract query (everything after @ until cursor)
      const query = textAfterAt.trim()
      
      mentionQuery.value = query
      mentionStartIndex.value = lastAtIndex
      
      // Search for users
      const users = query.length > 0 
        ? await searchUsers(query)
        : await searchUsers('')
      
      mentionUsers.value = users
      
      // Calculate position for autocomplete dropdown
      const textareaRect = textarea.getBoundingClientRect()
      
      mentionPosition.value = {
        top: textareaRect.bottom + 5,
        left: textareaRect.left + 10
      }
      
      showMentionAutocomplete.value = users.length > 0
      mentionSelectedIndex.value = 0
    } else {
      // Space found after @, mention is complete
      showMentionAutocomplete.value = false
    }
  } else {
    // No @ found
    showMentionAutocomplete.value = false
  }
}

// Handle keyboard navigation in mention autocomplete
const handleKeydown = (e: KeyboardEvent) => {
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
  const textarea = contentTextareaRef.value
  if (!textarea || mentionStartIndex.value === -1) return

  const text = form.value.content
  const textBeforeMention = text.substring(0, mentionStartIndex.value)
  const textAfterMention = text.substring(textarea.selectionStart)
  
  // Insert mention as "@Friendly Name "
  form.value.content = textBeforeMention + `@${user.name} ` + textAfterMention
  
  // Move cursor after the mention
  const newCursorPos = textBeforeMention.length + user.name.length + 2 // +2 for @ and space
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  }, 0)
  
  showMentionAutocomplete.value = false
  mentionStartIndex.value = -1
}

const handleSubmit = async () => {
  if (!form.value.content.trim()) {
    error.value = 'Please enter some content'
    return
  }

  submitting.value = true
  error.value = null

  if (status.value !== 'authenticated') {
    error.value = 'You must be signed in to create a post'
    submitting.value = false
    return
  }

  try {
    // Map active timeline tab -> payload audience array
    // - General: omit/empty (treated as "General" in UI)
    // - Staff/Faculty: explicit audience
    // - Employees: explicit audience (also shows in staff/faculty timelines per filter rules)
    const audience = (() => {
      switch (props.defaultAudience) {
        case 'students': return ['students']
        case 'employees': return ['employees']
        case 'staff': return ['staff']
        case 'faculty': return ['faculty']
        case 'general':
        default:
          return []
      }
    })()

    // Create Lexical content structure with mentions
    const content = createLexicalContentWithMentions(form.value.content.trim())

    const payload = {
      content,
      audience
    }

    const response = await $fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include cookies for auth
      body: payload
    })

    if (response) {
      resetForm()
      emit('postCreated')
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to create post. Please try again.'
    console.error('Error creating post:', err)
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  form.value = {
    content: '',
    category: ''
  }
  error.value = null
}
</script>

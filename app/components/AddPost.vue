<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Create a Post</h2>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <!-- <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
          What's on your mind?
        </label> -->
        <textarea
          id="content"
          v-model="form.content"
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,1)] focus:border-transparent"
          placeholder="Share your thoughts..."
          required
        ></textarea>
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
import { ref } from 'vue'

const emit = defineEmits<{
  postCreated: []
}>()

const form = ref({
  content: '',
  category: ''
})

const submitting = ref(false)
const error = ref<string | null>(null)

// Convert plain text to Lexical JSON format matching PayloadCMS structure
const createLexicalContent = (text: string) => {
  // Split by newlines and create paragraphs
  const lines = text.split('\n').filter(line => line.trim())
  
  // If no content, create empty paragraph
  if (lines.length === 0) {
    return {
      root: {
        children: [
          {
            children: [
              {
                text: '',
                type: 'text',
                version: 1
              }
            ],
            type: 'paragraph',
            version: 1
          }
        ],
        type: 'root',
        version: 1
      }
    }
  }
  
  // Create paragraphs for each line
  const children = lines.map(line => ({
    children: [
      {
        text: line,
        type: 'text',
        version: 1
      }
    ],
    type: 'paragraph',
    version: 1
  }))

  return {
    root: {
      children,
      type: 'root',
      version: 1
    }
  }
}

const handleSubmit = async () => {
  if (!form.value.content.trim()) {
    error.value = 'Please enter some content'
    return
  }

  submitting.value = true
  error.value = null

  try {
    const payload = {
      author: 1, // TODO: Replace with authenticated user ID
      content: createLexicalContent(form.value.content),
      categories: form.value.category ? [form.value.category] : []
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

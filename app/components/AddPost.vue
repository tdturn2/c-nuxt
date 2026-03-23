<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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

      <div>
        <label for="audience" class="block text-sm font-medium text-gray-700 mb-2">
          Target audience
        </label>
        <select
          id="audience"
          v-model="selectedAudience"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,1)] focus:border-transparent"
        >
          <option value="general">General</option>
          <option value="students">Students</option>
          <option value="employees">Employees</option>
          <option value="staff">Staff</option>
          <option value="faculty">Faculty</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Images (optional)</label>
        <div class="flex items-center gap-3">
          <input
            ref="imageInputRef"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="handleImageSelect"
          />
          <button
            type="button"
            @click="imageInputRef?.click()"
            :disabled="submitting"
            class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Images
          </button>
          <button
            type="button"
            @click="openGallery"
            :disabled="submitting || galleryLoading"
            class="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ galleryLoading ? 'Loading...' : 'My Gallery' }}
          </button>
          <span class="text-xs text-gray-500">Up to 4 images, max 5MB each.</span>
        </div>

        <div v-if="selectedImages.length > 0" class="grid grid-cols-2 gap-2 mt-3">
          <div
            v-for="(img, index) in selectedImages"
            :key="img.key"
            :class="[
              'relative rounded-md overflow-hidden border',
              img.file ? 'border-blue-300' : 'border-gray-200'
            ]"
          >
            <img :src="img.previewUrl" :alt="img.alt || 'Post image'" class="w-full h-32 object-cover" />
            <span
              v-if="img.fromGallery"
              class="absolute top-1 left-1 px-2 py-0.5 text-[10px] font-semibold text-white bg-indigo-600 rounded"
            >
              Reused
            </span>
            <button
              type="button"
              @click="removeSelectedImage(index)"
              class="absolute top-1 right-1 px-2 py-1 text-xs font-medium text-white bg-black/60 rounded hover:bg-black/80"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div v-if="error" class="text-sm text-red-600">
        {{ error }}
      </div>

      <div v-if="draftYoutubeEmbed || draftLinkPreview" class="rounded-md border border-gray-200 overflow-hidden">
        <div class="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
          Link Preview
        </div>
        <div v-if="draftYoutubeEmbed" class="aspect-video w-full">
          <iframe
            :src="draftYoutubeEmbed"
            class="w-full h-full block"
            style="border: none;"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
        <a
          v-else-if="draftLinkPreview"
          :href="draftLinkPreview.url"
          target="_blank"
          rel="noopener noreferrer"
          class="block hover:bg-gray-50 transition-colors"
        >
          <img
            v-if="draftLinkPreview.image"
            :src="draftLinkPreview.image"
            :alt="draftLinkPreview.title || 'Link preview image'"
            class="w-full h-40 object-cover border-b border-gray-200"
          />
          <div class="p-3">
            <div class="text-xs uppercase tracking-wide text-gray-500 mb-1">{{ draftLinkPreview.siteName }}</div>
            <div class="text-sm font-semibold text-gray-900 line-clamp-2">{{ draftLinkPreview.title }}</div>
            <div v-if="draftLinkPreview.description" class="text-xs text-gray-600 mt-1 line-clamp-3">
              {{ draftLinkPreview.description }}
            </div>
          </div>
        </a>
      </div>

      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          @click="resetForm(); emit('cancel')"
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

    <UModal v-model:open="galleryOpen" :ui="{ content: 'max-w-3xl', body: 'p-4' }">
      <template #header>
        <h3 class="text-base font-semibold text-gray-900">My Gallery</h3>
      </template>
      <template #body>
        <div v-if="galleryError" class="text-sm text-red-600 mb-3">{{ galleryError }}</div>
        <div v-if="galleryItems.length === 0 && !galleryLoading" class="text-sm text-gray-500">
          No previously uploaded images found.
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            v-for="item in galleryItems"
            :key="item.id"
            type="button"
            @click="toggleGalleryItem(item)"
            :disabled="!isGalleryItemSelected(item) && selectedImages.length >= 4"
            :class="[
              'relative rounded-md overflow-hidden border-2',
              isGalleryItemSelected(item) ? 'border-indigo-600' : 'border-transparent'
            ]"
          >
            <img :src="item.url" :alt="item.alt || 'Gallery image'" class="w-full h-28 object-cover" />
            <span
              v-if="isGalleryItemSelected(item)"
              class="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold text-white bg-indigo-600 rounded"
            >
              Selected
            </span>
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

const { status } = useAuth()
const { searchUsers, createLexicalContentWithMentions } = useMentions()
const { fetchPreview } = useLinkPreview()

const emit = defineEmits<{
  postCreated: []
  cancel: []
}>()

const props = defineProps<{
  defaultAudience?: 'general' | 'students' | 'employees' | 'staff' | 'faculty'
}>()

const form = ref({
  content: '',
})
const selectedAudience = ref<'general' | 'students' | 'employees' | 'staff' | 'faculty'>(props.defaultAudience ?? 'general')
const imageInputRef = ref<HTMLInputElement | null>(null)
type SelectedImage = {
  key: string
  previewUrl: string
  alt: string
  file?: File
  mediaId?: number
  fromGallery?: boolean
}
const selectedImages = ref<SelectedImage[]>([])
const galleryOpen = ref(false)
const galleryLoading = ref(false)
const galleryError = ref<string | null>(null)
const galleryItems = ref<Array<{ id: number; url: string; alt: string }>>([])

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
const draftLinkPreview = ref<{ url: string; title: string; description: string; image: string | null; siteName: string } | null>(null)
const draftYoutubeEmbed = ref<string | null>(null)
let previewDebounce: ReturnType<typeof setTimeout> | null = null

const extractUrlsFromText = (text: string): string[] => {
  const matches = text.match(/\bhttps?:\/\/[^\s<>"')\]}]+/gi)
  return matches || []
}

const getYoutubeEmbed = (url: string): string | null => {
  if (!url) return null
  if (url.includes('youtube.com/watch?v=')) {
    const id = url.split('v=')[1]?.split('&')[0]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  return null
}

const handleImageSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (!files.length) return

  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  if (imageFiles.length !== files.length) {
    error.value = 'Only image files are allowed'
  }

  const oversized = imageFiles.find((file) => file.size > 5 * 1024 * 1024)
  if (oversized) {
    error.value = 'Each image must be less than 5MB'
    if (target) target.value = ''
    return
  }

  const nextImages = [...selectedImages.value]
  for (const file of imageFiles) {
    if (nextImages.length >= 4) break
    nextImages.push({
      key: `new-${file.name}-${file.size}-${Date.now()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      alt: file.name
    })
  }
  selectedImages.value = nextImages

  if (selectedImages.value.length >= 4) {
    error.value = 'Maximum 4 images per post'
  } else {
    error.value = null
  }

  if (target) target.value = ''
}

const removeSelectedImage = (index: number) => {
  const image = selectedImages.value[index]
  if (image?.file && image?.previewUrl) {
    URL.revokeObjectURL(image.previewUrl)
  }
  selectedImages.value.splice(index, 1)
}

const fetchGallery = async () => {
  galleryLoading.value = true
  galleryError.value = null
  try {
    const response = await $fetch<{ docs: Array<{ id: number; url: string; alt: string }> }>('/api/connect-user-media?kind=post-images&limit=100', {
      credentials: 'include'
    })
    galleryItems.value = (response?.docs || []).filter((item) => item.url)
  } catch (err: any) {
    galleryError.value = err?.data?.message || 'Failed to load gallery'
  } finally {
    galleryLoading.value = false
  }
}

const openGallery = async () => {
  galleryOpen.value = true
  await fetchGallery()
}

const isGalleryItemSelected = (item: { id: number }) =>
  selectedImages.value.some((img) => img.mediaId === item.id)

const toggleGalleryItem = (item: { id: number; url: string; alt: string }) => {
  const existingIdx = selectedImages.value.findIndex((img) => img.mediaId === item.id)
  if (existingIdx >= 0) {
    selectedImages.value.splice(existingIdx, 1)
    return
  }
  if (selectedImages.value.length >= 4) return
  selectedImages.value.push({
    key: `gallery-${item.id}`,
    previewUrl: item.url,
    alt: item.alt || 'Post image',
    mediaId: item.id,
    fromGallery: true
  })
}

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
    // Map selected audience to payload audience array.
    const audience = (() => {
      switch (selectedAudience.value) {
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
    let imagesConnectUserMedia: Array<{ image: number }> = []

    if (selectedImages.value.length > 0) {
      for (const selectedImage of selectedImages.value) {
        if (selectedImage.mediaId) {
          const normalizedExistingId = Number(selectedImage.mediaId)
          if (!Number.isNaN(normalizedExistingId) && normalizedExistingId > 0) {
            imagesConnectUserMedia.push({ image: normalizedExistingId })
          }
          continue
        }
        if (!selectedImage.file) continue
        const uploadForm = new FormData()
        uploadForm.append('file', selectedImage.file)
        uploadForm.append('alt', selectedImage.alt || selectedImage.file.name)

        const media: any = await $fetch('/api/connect-user-media/upload', {
          method: 'POST',
          body: uploadForm
        })

        const uploadedId = Number(media?.id)
        if (!Number.isNaN(uploadedId) && uploadedId > 0) {
          imagesConnectUserMedia.push({ image: uploadedId })
        }
      }
    }

    const payload: Record<string, any> = {
      content,
      audience
    }
    if (imagesConnectUserMedia.length > 0) {
      payload.imagesConnectUserMedia = imagesConnectUserMedia
      payload.images = imagesConnectUserMedia
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
  selectedImages.value.forEach((img) => {
    if (img.file && img.previewUrl) URL.revokeObjectURL(img.previewUrl)
  })
  form.value = {
    content: ''
  }
  selectedAudience.value = props.defaultAudience ?? 'general'
  selectedImages.value = []
  draftLinkPreview.value = null
  draftYoutubeEmbed.value = null
  galleryOpen.value = false
  galleryError.value = null
  error.value = null
}

watch(
  () => form.value.content,
  (content) => {
    if (previewDebounce) clearTimeout(previewDebounce)
    previewDebounce = setTimeout(async () => {
      const urls = extractUrlsFromText(content || '')
      const firstUrl = urls[0]
      if (!firstUrl) {
        draftLinkPreview.value = null
        draftYoutubeEmbed.value = null
        return
      }

      const ytEmbed = getYoutubeEmbed(firstUrl)
      if (ytEmbed) {
        draftYoutubeEmbed.value = ytEmbed
        draftLinkPreview.value = null
        return
      }

      draftYoutubeEmbed.value = null
      draftLinkPreview.value = await fetchPreview(firstUrl)
    }, 350)
  },
  { immediate: true }
)
</script>

<template>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>

      <div v-if="loading" class="text-center py-8">
        <div class="text-gray-500">Loading profile...</div>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div class="text-red-800 text-sm">{{ error }}</div>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Avatar Section -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
          <div class="flex items-center gap-4">
            <div class="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                v-if="profileData.avatar?.url"
                :src="profileData.avatar.url"
                :alt="profileData.name"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-gray-600 font-semibold text-2xl">
                {{ profileData.name?.charAt(0).toUpperCase() }}
              </span>
            </div>
            <div class="flex-1">
              <input
                ref="avatarInputRef"
                type="file"
                accept="image/*"
                @change="handleAvatarChange"
                class="hidden"
              />
              <button
                type="button"
                @click="avatarInputRef?.click()"
                :disabled="uploadingAvatar"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ uploadingAvatar ? 'Uploading...' : 'Change Photo' }}
              </button>
              <p class="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max size 5MB.</p>
            </div>
          </div>
        </div>

        <!-- Bio Section -->
        <div>
          <label for="bio" class="block text-sm font-medium text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            v-model="bio"
            rows="4"
            placeholder="Tell us about yourself..."
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <!-- Submit Button -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <NuxtLink
            to="/"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </NuxtLink>
          <button
            type="submit"
            :disabled="saving || !hasChanges"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: session } = useAuth()
const { currentPayloadUserId } = useCurrentUser()

const loading = ref(true)
const saving = ref(false)
const uploadingAvatar = ref(false)
const error = ref<string | null>(null)
const avatarInputRef = ref<HTMLInputElement | null>(null)

const profileData = ref<{
  id: number
  name: string
  email: string
  bio: string | null
  avatar: {
    id: number
    url: string
  } | null
}>({
  id: 0,
  name: '',
  email: '',
  bio: null,
  avatar: null
})

const bio = ref('')

// Check if there are unsaved changes
const hasChanges = computed(() => {
  return bio.value !== (profileData.value.bio || '')
})

// Load user profile
const loadProfile = async () => {
  if (!currentPayloadUserId.value) {
    error.value = 'You must be signed in to view your profile'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const user = await $fetch(`/api/users/${currentPayloadUserId.value}`)
    
    profileData.value = {
      id: user.id,
      name: user.name,
      email: user.email,
      bio: user.bio || null,
      avatar: user.avatar || null
    }
    
    bio.value = user.bio || ''
  } catch (err: any) {
    console.error('Error loading profile:', err)
    error.value = err.data?.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

// Handle avatar upload
const handleAvatarChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'File size must be less than 5MB'
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }

  try {
    uploadingAvatar.value = true
    error.value = null

    const formData = new FormData()
    formData.append('avatar', file)

    const updatedUser = await $fetch('/api/users/profile/avatar', {
      method: 'POST',
      body: formData
    })

    // Update local profile data
    profileData.value.avatar = updatedUser.avatar
    
    // Reset file input
    if (avatarInputRef.value) {
      avatarInputRef.value.value = ''
    }
  } catch (err: any) {
    console.error('Error uploading avatar:', err)
    error.value = err.data?.message || 'Failed to upload avatar'
  } finally {
    uploadingAvatar.value = false
  }
}

// Handle form submit (bio update)
const handleSubmit = async () => {
  if (!hasChanges.value || saving.value) return

  try {
    saving.value = true
    error.value = null

    const updatedUser = await $fetch('/api/users/profile', {
      method: 'PATCH',
      body: {
        bio: bio.value.trim() || null
      }
    })

    // Update local profile data
    profileData.value.bio = updatedUser.bio
    bio.value = updatedUser.bio || ''
  } catch (err: any) {
    console.error('Error updating profile:', err)
    error.value = err.data?.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

// Load profile on mount
onMounted(() => {
  if (import.meta.client) {
    loadProfile()
  }
})

// Watch for user ID changes
watch(currentPayloadUserId, (newId) => {
  if (newId) {
    loadProfile()
  }
})
</script>

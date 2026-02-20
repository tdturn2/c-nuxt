<template>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Employee Profile</h1>

      <div v-if="authLoading" class="text-center py-8">
        <div class="text-gray-500">Loading profile...</div>
      </div>

      <div v-else-if="!meUser" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div class="text-red-800 text-sm">You must be signed in to view your profile.</div>
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

        <!-- Employee Title Section -->
        <div>
          <label for="employeeTitle" class="block text-sm font-medium text-gray-700 mb-2">
            Employee Title
          </label>
          <input
            id="employeeTitle"
            v-model="employeeTitle"
            type="text"
            placeholder="Enter your title..."
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Section (mapped from employeeTitle) -->
        <div>
          <label for="section" class="block text-sm font-medium text-gray-700 mb-2">
            Section
          </label>
          <input
            id="section"
            v-model="section"
            type="text"
            placeholder="Enter section..."
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Department -->
        <div>
          <label for="department" class="block text-sm font-medium text-gray-700 mb-2">
            Department
          </label>
          <input
            id="department"
            v-model="department"
            type="text"
            placeholder="Enter department..."
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Start Date -->
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            id="startDate"
            v-model="startDate"
            type="date"
            class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Phone -->
        <div>
          <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            placeholder="Enter phone number..."
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Location -->
        <div>
          <label for="location" class="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            id="location"
            v-model="location"
            type="text"
            placeholder="Enter location..."
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
const { user: meUser, loading: authLoading, refresh } = useMe()

const saving = ref(false)
const uploadingAvatar = ref(false)
const error = ref<string | null>(null)
const avatarInputRef = ref<HTMLInputElement | null>(null)

const profileData = ref<{
  id: number
  name: string
  email: string
  bio: string | null
  avatar: { id: number; url: string } | null
  employeeTitle: string | null
  section: string | null
  startDate: string | null
  phone: string | null
  location: string | null
  department: string | null
}>({
  id: 0,
  name: '',
  email: '',
  bio: null,
  avatar: null,
  employeeTitle: null,
  section: null,
  startDate: null,
  phone: null,
  location: null,
  department: null
})

const bio = ref('')
const employeeTitle = ref('')
const section = ref('')
const startDate = ref('')
const phone = ref('')
const location = ref('')
const department = ref('')

const hasChanges = computed(() => (
  bio.value !== (profileData.value.bio || '') ||
  employeeTitle.value !== (profileData.value.employeeTitle || '') ||
  section.value !== (profileData.value.section || '') ||
  startDate.value !== (profileData.value.startDate || '') ||
  phone.value !== (profileData.value.phone || '') ||
  location.value !== (profileData.value.location || '') ||
  department.value !== (profileData.value.department || '')
))

function applyUser(user: any) {
  profileData.value = {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio || null,
    avatar: user.avatar || null,
    employeeTitle: user.employeeTitle || null,
    section: user.section || null,
    startDate: user.startDate || null,
    phone: user.phone || null,
    location: user.location || null,
    department: user.department || null
  }
  bio.value = user.bio || ''
  employeeTitle.value = user.employeeTitle || ''
  section.value = user.section || ''
  startDate.value = user.startDate || ''
  phone.value = user.phone || ''
  location.value = user.location || ''
  department.value = user.department || ''
}

watch(meUser, (u) => {
  if (u) applyUser(u)
}, { immediate: true })

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

    profileData.value.avatar = updatedUser.avatar
    refresh()

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

// Handle form submit
const handleSubmit = async () => {
  if (!hasChanges.value || saving.value) return

  try {
    saving.value = true
    error.value = null

    const updatedUser = await $fetch('/api/employees/profile', {
      method: 'PATCH',
      body: {
        bio: bio.value.trim() || null,
        employeeTitle: employeeTitle.value.trim() || null,
        section: section.value.trim() || null,
        startDate: startDate.value || null,
        phone: phone.value.trim() || null,
        location: location.value.trim() || null,
        department: department.value.trim() || null
      }
    })

    // Update local profile data
    profileData.value.bio = updatedUser.bio
    profileData.value.employeeTitle = updatedUser.employeeTitle
    profileData.value.section = updatedUser.section
    profileData.value.startDate = updatedUser.startDate
    profileData.value.phone = updatedUser.phone
    profileData.value.location = updatedUser.location
    profileData.value.department = updatedUser.department
    
    bio.value = updatedUser.bio || ''
    employeeTitle.value = updatedUser.employeeTitle || ''
    section.value = updatedUser.section || ''
    startDate.value = updatedUser.startDate || ''
    phone.value = updatedUser.phone || ''
    location.value = updatedUser.location || ''
    department.value = updatedUser.department || ''
  } catch (err: any) {
    console.error('Error updating profile:', err)
    error.value = err.data?.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (import.meta.client) refresh()
})
</script>

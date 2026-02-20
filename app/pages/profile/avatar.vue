<template>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Profile Photo</h1>

      <div v-if="authLoading" class="text-center py-8">
        <div class="text-gray-500">Loading profile...</div>
      </div>

      <div v-else-if="!meUser" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div class="text-red-800 text-sm">You must be signed in to edit your profile.</div>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div class="text-red-800 text-sm">{{ error }}</div>
      </div>

      <div v-else class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
          <div class="flex items-center gap-4">
            <div class="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                v-if="profileData.avatar?.url"
                :src="profileData.avatar.url"
                :alt="profileData.name || 'Avatar'"
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

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <NuxtLink
            to="/"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Done
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user: meUser, loading: authLoading, refresh } = useMe()

const uploadingAvatar = ref(false)
const error = ref<string | null>(null)
const avatarInputRef = ref<HTMLInputElement | null>(null)

const profileData = computed(() => ({
  id: meUser.value?.id ?? 0,
  name: meUser.value?.name ?? '',
  email: meUser.value?.email ?? '',
  avatar: meUser.value?.avatar ?? null
}))

const handleAvatarChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    error.value = 'File size must be less than 5MB'
    return
  }
  if (!file.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }

  try {
    uploadingAvatar.value = true
    error.value = null

    const formData = new FormData()
    formData.append('avatar', file)

    const updatedUser: any = await $fetch('/api/users/profile/avatar', {
      method: 'POST',
      body: formData
    })

    refresh()

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

onMounted(() => {
  if (import.meta.client) refresh()
})
</script>


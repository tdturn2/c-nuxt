<template>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Update Alumni Profile</h1>

      <div v-if="authLoading" class="text-center py-8">
        <div class="text-gray-500">Loading profile...</div>
      </div>

      <div v-else-if="!meUser" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div class="text-red-800 text-sm">You must be signed in to edit your profile.</div>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div class="text-red-800 text-sm">{{ error }}</div>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-6">
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

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">Degrees</label>
            <button
              type="button"
              @click="addDegree"
              class="px-3 py-1 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] transition-colors"
            >
              Add Degree
            </button>
          </div>

          <div v-if="alumniDegrees.length === 0" class="text-sm text-gray-500 mb-2">
            No degrees added yet.
          </div>

          <div v-for="(item, idx) in alumniDegrees" :key="item.id" class="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 mb-2">
            <input
              v-model="item.degree"
              type="text"
              placeholder="e.g., MDiv"
              class="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              v-model="item.graduationYear"
              type="number"
              min="1900"
              :max="maxGraduationYear"
              placeholder="Year"
              class="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              @click="removeDegree(idx)"
              class="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input id="alumniOptIn" v-model="alumniOptIn" type="checkbox" class="rounded border-gray-300" />
          <label for="alumniOptIn" class="text-sm text-gray-700">I agree to share this data</label>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="alumniEmail" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input id="alumniEmail" v-model="alumniContact.email" type="email" class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label for="alumniPhone" class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input id="alumniPhone" v-model="alumniContact.phone" type="tel" class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label for="facebook" class="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
            <input id="facebook" v-model="alumniContact.facebook" type="text" class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label for="x" class="block text-sm font-medium text-gray-700 mb-2">X</label>
            <input id="x" v-model="alumniContact.x" type="text" class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label for="instagram" class="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
            <input id="instagram" v-model="alumniContact.instagram" type="text" class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>

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
type AlumniDegreeForm = {
  id: string
  degree: string
  graduationYear: string
}

const { user: meUser, loading: authLoading, refresh } = useMe()
const saving = ref(false)
const uploadingAvatar = ref(false)
const error = ref<string | null>(null)
const avatarInputRef = ref<HTMLInputElement | null>(null)

const maxGraduationYear = new Date().getFullYear() + 10
const alumniOptIn = ref(false)
const alumniDegrees = ref<AlumniDegreeForm[]>([])
const alumniContact = ref({
  email: '',
  phone: '',
  facebook: '',
  x: '',
  instagram: '',
})

const initialJson = ref('')
const profileData = computed(() => ({
  id: meUser.value?.id ?? 0,
  name: meUser.value?.name ?? '',
  avatar: meUser.value?.avatar ?? null,
}))

const serializeForm = () => JSON.stringify({
  alumniOptIn: alumniOptIn.value,
  alumniDegrees: alumniDegrees.value,
  alumniContact: alumniContact.value,
})

const hasChanges = computed(() => initialJson.value !== serializeForm())

function applyUser(user: any) {
  alumniOptIn.value = Boolean(user.alumniOptIn)
  alumniDegrees.value = Array.isArray(user.alumniDegrees)
    ? user.alumniDegrees.map((entry: any) => ({
        id: entry.id || `${Date.now()}-${Math.random()}`,
        degree: entry.degree || '',
        graduationYear: entry.graduationYear ? String(entry.graduationYear) : '',
      }))
    : []
  alumniContact.value = {
    email: user.alumniContact?.email || '',
    phone: user.alumniContact?.phone || '',
    facebook: user.alumniContact?.facebook || '',
    x: user.alumniContact?.x || '',
    instagram: user.alumniContact?.instagram || '',
  }
  initialJson.value = serializeForm()
}

watch(meUser, (u) => {
  if (u) applyUser(u)
}, { immediate: true })

const addDegree = () => {
  alumniDegrees.value.push({
    id: `${Date.now()}-${Math.random()}`,
    degree: '',
    graduationYear: '',
  })
}

const removeDegree = (index: number) => {
  alumniDegrees.value.splice(index, 1)
}

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

    await $fetch('/api/users/profile/avatar', {
      method: 'POST',
      body: formData,
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

const handleSubmit = async () => {
  if (!hasChanges.value || saving.value) return

  try {
    saving.value = true
    error.value = null

    const updated = await $fetch('/api/employees/profile', {
      method: 'PATCH',
      body: {
        alumniOptIn: alumniOptIn.value,
        alumniDegrees: alumniDegrees.value
          .map((item) => ({
            degree: item.degree.trim(),
            graduationYear: Number.parseInt(item.graduationYear, 10),
          }))
          .filter((item) => item.degree.length > 0 && Number.isFinite(item.graduationYear)),
        alumniContact: {
          email: alumniContact.value.email.trim() || null,
          phone: alumniContact.value.phone.trim() || null,
          facebook: alumniContact.value.facebook.trim() || null,
          x: alumniContact.value.x.trim() || null,
          instagram: alumniContact.value.instagram.trim() || null,
        },
      },
    })

    applyUser(updated)
    refresh()
  } catch (err: any) {
    console.error('Error updating alumni profile:', err)
    error.value = err.data?.error || err.data?.message || 'Failed to update alumni profile'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (import.meta.client) refresh()
})
</script>

<template>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Faculty Profile</h1>

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
        <!-- Faculty Bio (Rich Text Editor) -->
        <div>
          <label for="facultyBio" class="block text-sm font-medium text-gray-700 mb-2">
            Faculty Bio
          </label>
          <UEditor
            id="facultyBio"
            v-model="facultyBioTipTap"
            :options="{ images: false }"
            placeholder="Enter your faculty bio..."
          />
        </div>

        <!-- Faculty Photo -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Faculty Photo</label>
          <div class="flex items-center gap-4">
            <div class="w-32 h-32 rounded-lg bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
              <img
                v-if="facultyPhotoUrl"
                :src="facultyPhotoUrl"
                alt="Faculty Photo"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-gray-600 font-semibold text-sm text-center px-2">
                No photo
              </span>
            </div>
            <div class="flex-1">
              <input
                ref="facultyPhotoInputRef"
                type="file"
                accept="image/*"
                @change="handleFacultyPhotoChange"
                class="hidden"
              />
              <button
                type="button"
                @click="facultyPhotoInputRef?.click()"
                :disabled="uploadingFacultyPhoto"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ uploadingFacultyPhoto ? 'Uploading...' : facultyPhotoId ? 'Change Photo' : 'Upload Photo' }}
              </button>
              <button
                v-if="facultyPhotoId"
                type="button"
                @click="clearFacultyPhoto"
                class="ml-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
              <p class="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max size 5MB.</p>
            </div>
          </div>
        </div>

        <!-- Faculty Photo Small -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Faculty Photo Small</label>
          <div class="flex items-center gap-4">
            <div class="w-24 h-24 rounded-lg bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
              <img
                v-if="facultyPhotoSmallUrl"
                :src="facultyPhotoSmallUrl"
                alt="Faculty Photo Small"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-gray-600 font-semibold text-sm text-center px-2">
                No photo
              </span>
            </div>
            <div class="flex-1">
              <input
                ref="facultyPhotoSmallInputRef"
                type="file"
                accept="image/*"
                @change="handleFacultyPhotoSmallChange"
                class="hidden"
              />
              <button
                type="button"
                @click="facultyPhotoSmallInputRef?.click()"
                :disabled="uploadingFacultyPhotoSmall"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ uploadingFacultyPhotoSmall ? 'Uploading...' : facultyPhotoSmallId ? 'Change Photo' : 'Upload Photo' }}
              </button>
              <button
                v-if="facultyPhotoSmallId"
                type="button"
                @click="clearFacultyPhotoSmall"
                class="ml-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
              <p class="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max size 5MB.</p>
            </div>
          </div>
        </div>

        <!-- Expertise (Repeatable) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">Expertise</label>
            <button
              type="button"
              @click="addExpertise"
              class="px-3 py-1 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] transition-colors"
            >
              Add Expertise
            </button>
          </div>
          <div v-if="expertise.length === 0" class="text-sm text-gray-500 mb-2">
            No expertise items yet.
          </div>
          <div v-for="(item, idx) in expertise" :key="item.id" class="flex items-center gap-2 mb-2">
            <input
              v-model="item.item"
              type="text"
              placeholder="Enter expertise area..."
              class="flex-1 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              @click="removeExpertise(idx)"
              class="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>

        <!-- Education (Repeatable) -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-gray-700">Education</label>
            <button
              type="button"
              @click="addEducation"
              class="px-3 py-1 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] transition-colors"
            >
              Add Education
            </button>
          </div>
          <div v-if="education.length === 0" class="text-sm text-gray-500 mb-2">
            No education items yet.
          </div>
          <div v-for="(item, idx) in education" :key="item.id" class="flex items-center gap-2 mb-2">
            <input
              v-model="item.item"
              type="text"
              placeholder="e.g., MDiv, 2020"
              class="flex-1 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              @click="removeEducation(idx)"
              class="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              Remove
            </button>
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
const { user: meUser, loading: authLoading, refresh } = useMe()
const config = useRuntimeConfig()
const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'

const saving = ref(false)
const error = ref<string | null>(null)

const facultyPhotoInputRef = ref<HTMLInputElement | null>(null)
const facultyPhotoSmallInputRef = ref<HTMLInputElement | null>(null)
const uploadingFacultyPhoto = ref(false)
const uploadingFacultyPhotoSmall = ref(false)

// Faculty Bio - UEditor uses TipTap format, but backend uses Lexical
// We'll maintain both formats and convert between them
const facultyBioTipTap = ref<any>(null) // For UEditor (TipTap format)
const facultyBioLexical = ref<any>(null) // For backend (Lexical format)

// Photos
const facultyPhotoId = ref<number | null>(null)
const facultyPhotoUrl = ref<string | null>(null)
const facultyPhotoSmallId = ref<number | null>(null)
const facultyPhotoSmallUrl = ref<string | null>(null)

// Repeatable fields
type RepeatableItem = {
  id: string
  item: string
}

const expertise = ref<RepeatableItem[]>([])
const education = ref<RepeatableItem[]>([])

const initialJson = ref<string>('')

const normalizeUrl = (url: string) => {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? `${payloadBaseUrl}${url}` : `${payloadBaseUrl}/${url}`
}

// Convert Lexical format (backend) to TipTap format (UEditor)
const lexicalToTipTap = (lexical: any): any => {
  if (!lexical?.root?.children) {
    return {
      type: 'doc',
      content: []
    }
  }

  const convertNode = (node: any): any => {
    if (node.type === 'text') {
      return {
        type: 'text',
        text: node.text || ''
      }
    }

    if (node.type === 'paragraph') {
      const children = node.children ? node.children.map(convertNode).filter((n: any) => n) : []
      return {
        type: 'paragraph',
        content: children.length > 0 ? children : [{ type: 'text', text: '' }]
      }
    }

    // Handle other node types as needed
    if (node.children) {
      return {
        type: node.type === 'root' ? 'doc' : node.type,
        content: node.children.map(convertNode).filter((n: any) => n)
      }
    }

    return null
  }

  const content = lexical.root.children.map(convertNode).filter((n: any) => n)
  
  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }]
  }
}

// Convert TipTap format (UEditor) to Lexical format (backend)
const tipTapToLexical = (tipTap: any): any => {
  if (!tipTap || !tipTap.content || tipTap.type !== 'doc') {
    return null
  }

  const convertNode = (node: any): any => {
    if (node.type === 'text') {
      return {
        mode: 'normal',
        text: node.text || '',
        type: 'text',
        style: '',
        detail: 0,
        format: 0,
        version: 1
      }
    }

    if (node.type === 'paragraph') {
      const children = node.content ? node.content.map(convertNode).filter((n: any) => n && n.text) : []
      return {
        type: 'paragraph',
        format: 'justify',
        indent: 0,
        version: 1,
        children: children.length > 0 ? children : [],
        direction: null,
        textStyle: '',
        textFormat: 0
      }
    }

    // Handle other node types
    if (node.content) {
      return {
        type: node.type,
        children: node.content.map(convertNode).filter((n: any) => n)
      }
    }

    return null
  }

  const children = tipTap.content.map(convertNode).filter((n: any) => n)
  
  if (children.length === 0) {
    return null
  }

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children,
      direction: null
    }
  }
}

const hasChanges = computed(() => {
  const current = JSON.stringify({
    facultyBio: facultyBioLexical.value,
    facultyPhoto: facultyPhotoId.value,
    facultyPhotoSmall: facultyPhotoSmallId.value,
    expertise: expertise.value,
    education: education.value
  })
  return current !== initialJson.value
})

function applyUser(user: any) {
  facultyBioLexical.value = user.facultyBio || null
  facultyBioTipTap.value = user.facultyBio ? lexicalToTipTap(user.facultyBio) : { type: 'doc', content: [] }
  facultyPhotoId.value = typeof user.facultyPhoto === 'number' ? user.facultyPhoto : (user.facultyPhoto?.id ?? null)
  facultyPhotoUrl.value = user.facultyPhoto?.url ? normalizeUrl(user.facultyPhoto.url) : null
  facultyPhotoSmallId.value = typeof user.facultyPhotoSmall === 'number' ? user.facultyPhotoSmall : (user.facultyPhotoSmall?.id ?? null)
  facultyPhotoSmallUrl.value = user.facultyPhotoSmall?.url ? normalizeUrl(user.facultyPhotoSmall.url) : null
  expertise.value = Array.isArray(user.expertise)
    ? user.expertise.map((item: any) => ({ id: item.id || `${Date.now()}-${Math.random()}`, item: item.item || '' }))
    : []
  education.value = Array.isArray(user.education)
    ? user.education.map((item: any) => ({ id: item.id || `${Date.now()}-${Math.random()}`, item: item.item || '' }))
    : []
  initialJson.value = JSON.stringify({
    facultyBio: facultyBioLexical.value,
    facultyPhoto: facultyPhotoId.value,
    facultyPhotoSmall: facultyPhotoSmallId.value,
    expertise: expertise.value,
    education: education.value
  })
}

watch(meUser, (u) => {
  if (u) applyUser(u)
}, { immediate: true })


const addExpertise = () => {
  expertise.value.push({
    id: `${Date.now()}-${Math.random()}`,
    item: ''
  })
}

const removeExpertise = (idx: number) => {
  expertise.value.splice(idx, 1)
}

const addEducation = () => {
  education.value.push({
    id: `${Date.now()}-${Math.random()}`,
    item: ''
  })
}

const removeEducation = (idx: number) => {
  education.value.splice(idx, 1)
}

const handleFacultyPhotoChange = async (e: Event) => {
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
    uploadingFacultyPhoto.value = true
    error.value = null

    const formData = new FormData()
    formData.append('file', file)

    const media: any = await $fetch('/api/media/upload', {
      method: 'POST',
      body: formData
    })

    facultyPhotoId.value = media.id
    facultyPhotoUrl.value = media.url ? normalizeUrl(media.url) : null

    if (facultyPhotoInputRef.value) {
      facultyPhotoInputRef.value.value = ''
    }
  } catch (err: any) {
    console.error('Error uploading faculty photo:', err)
    error.value = err.data?.message || 'Failed to upload photo'
  } finally {
    uploadingFacultyPhoto.value = false
  }
}

const clearFacultyPhoto = () => {
  facultyPhotoId.value = null
  facultyPhotoUrl.value = null
}

const handleFacultyPhotoSmallChange = async (e: Event) => {
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
    uploadingFacultyPhotoSmall.value = true
    error.value = null

    const formData = new FormData()
    formData.append('file', file)

    const media: any = await $fetch('/api/media/upload', {
      method: 'POST',
      body: formData
    })

    facultyPhotoSmallId.value = media.id
    facultyPhotoSmallUrl.value = media.url ? normalizeUrl(media.url) : null

    if (facultyPhotoSmallInputRef.value) {
      facultyPhotoSmallInputRef.value.value = ''
    }
  } catch (err: any) {
    console.error('Error uploading faculty photo small:', err)
    error.value = err.data?.message || 'Failed to upload photo'
  } finally {
    uploadingFacultyPhotoSmall.value = false
  }
}

const clearFacultyPhotoSmall = () => {
  facultyPhotoSmallId.value = null
  facultyPhotoSmallUrl.value = null
}

const handleSubmit = async () => {
  if (!hasChanges.value || saving.value) return
  
  try {
    saving.value = true
    error.value = null

    // Convert TipTap format back to Lexical format before saving
    const bioLexical = tipTapToLexical(facultyBioTipTap.value)

    const updated: any = await $fetch('/api/employees/profile', {
      method: 'PATCH',
      body: {
        facultyBio: bioLexical,
        facultyPhoto: facultyPhotoId.value,
        facultyPhotoSmall: facultyPhotoSmallId.value,
        expertise: expertise.value.map(item => ({
          id: item.id,
          item: item.item.trim()
        })).filter(item => item.item.length > 0),
        education: education.value.map(item => ({
          id: item.id,
          item: item.item.trim()
        })).filter(item => item.item.length > 0)
      }
    })

    refresh()
  } catch (err: any) {
    console.error('Error updating faculty profile:', err)
    error.value = err.data?.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

// Watch TipTap content and convert to Lexical for change tracking
watch(facultyBioTipTap, (newTipTap) => {
  facultyBioLexical.value = tipTapToLexical(newTipTap)
}, { deep: true })

onMounted(() => {
  if (import.meta.client) refresh()
})
</script>

<template>
  <div>
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div class="text-red-800 text-sm">{{ error }}</div>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">Degrees</label>
          <button
            type="button"
            class="px-3 py-1 text-sm font-medium text-white bg-[rgba(13,94,130,1)] rounded-md hover:bg-[rgba(10,69,92,1)] transition-colors"
            @click="addDegree"
          >
            Add Degree
          </button>
        </div>

        <div v-if="alumniDegrees.length === 0" class="text-sm text-gray-500 mb-2">
          No degrees added yet.
        </div>

        <div
          v-for="(item, idx) in alumniDegrees"
          :key="item.id"
          class="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 mb-2"
        >
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
            class="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            @click="removeDegree(idx)"
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
        <button
          type="submit"
          :disabled="saving || !hasChanges"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ saving ? 'Saving...' : 'Save Alumni Profile' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
type AlumniDegreeForm = {
  id: string
  degree: string
  graduationYear: string
}

const { user: meUser, refresh } = useMe()
const saving = ref(false)
const error = ref<string | null>(null)

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
</script>

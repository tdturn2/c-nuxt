<template>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-500">Loading profile...</div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-6">
      <div class="text-red-800">{{ error }}</div>
    </div>

    <div v-else-if="employeeData" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <!-- Profile Header -->
      <div class="flex flex-col items-center text-center mb-8">
        <!-- Avatar -->
        <div class="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mb-4">
          <img
            v-if="employeeData.avatar?.url"
            :src="employeeData.avatar.url"
            :alt="employeeData.name"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-gray-600 font-semibold text-4xl">
            {{ employeeData.name?.charAt(0).toUpperCase() }}
          </span>
        </div>

        <!-- Name -->
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ employeeData.name }}</h1>
        
        <!-- Employee Title (mapped to section) -->
        <p v-if="employeeData.section" class="text-lg text-gray-600 mb-1">{{ employeeData.section }}</p>
        
        <!-- Email -->
        <p class="text-gray-500 text-sm">{{ employeeData.email }}</p>
      </div>

      <!-- Bio Section -->
      <div v-if="employeeData.bio" class="border-t border-gray-200 pt-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">About</h2>
        <p class="text-gray-700 whitespace-pre-wrap">{{ employeeData.bio }}</p>
      </div>

      <!-- Employee Details -->
      <div class="border-t border-gray-200 pt-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Employee Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="employeeData.employeeTitle">
            <span class="text-sm font-medium text-gray-500">Title</span>
            <p class="text-gray-900">{{ employeeData.employeeTitle }}</p>
          </div>
          <div v-if="employeeData.department">
            <span class="text-sm font-medium text-gray-500">Department</span>
            <p class="text-gray-900">{{ employeeData.department }}</p>
          </div>
          <div v-if="employeeData.startDate">
            <span class="text-sm font-medium text-gray-500">Start Date</span>
            <p class="text-gray-900">{{ formatDate(employeeData.startDate) }}</p>
          </div>
          <div v-if="employeeData.phone">
            <span class="text-sm font-medium text-gray-500">Phone</span>
            <p class="text-gray-900">{{ employeeData.phone }}</p>
          </div>
          <div v-if="employeeData.location" class="md:col-span-2">
            <span class="text-sm font-medium text-gray-500">Location</span>
            <p class="text-gray-900">{{ employeeData.location }}</p>
          </div>
        </div>
      </div>

      <!-- Publications Section -->
      <div v-if="employeeData.publications && employeeData.publications.length > 0" class="border-t border-gray-200 pt-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Publications</h2>
        <div class="space-y-6">
          <div
            v-for="publication in employeeData.publications"
            :key="publication.id"
            class="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div v-if="publication.image?.url" class="flex-shrink-0">
              <img
                :src="publication.image.url"
                :alt="publication.title"
                class="w-24 h-32 object-cover rounded"
              />
            </div>
            <div class="flex-1">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ publication.title }}</h3>
                  <span class="text-sm text-gray-500 capitalize">{{ publication.type }}</span>
                </div>
                <span v-if="publication.releaseDate" class="text-sm text-gray-500">
                  {{ formatDate(publication.releaseDate) }}
                </span>
              </div>
              <p v-if="publication.description" class="text-gray-700 mb-2">{{ publication.description }}</p>
              <a
                v-if="publication.purchaseLink"
                :href="publication.purchaseLink"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Purchase Link →
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Sessions Section -->
      <div v-if="employeeData.sessions && employeeData.sessions.length > 0" class="border-t border-gray-200 pt-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Sessions</h2>
        <div class="space-y-3">
          <div
            v-for="session in employeeData.sessions"
            :key="session.id"
            class="p-4 border border-gray-200 rounded-lg"
          >
            <h3 class="font-semibold text-gray-900">{{ session.title || 'Session' }}</h3>
            <p v-if="session.description" class="text-gray-700 mt-1">{{ session.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const employeeId = computed(() => route.params.id as string)

const loading = ref(true)
const error = ref<string | null>(null)
const employeeData = ref<{
  id: number
  name: string
  email: string
  bio: string | null
  avatar: {
    url: string
  } | null
  employeeTitle: string | null
  startDate: string | null
  phone: string | null
  location: string | null
  department: string | null
  section: string | null
  publications: Array<{
    id: string
    type: string
    title: string
    image: {
      url: string
    } | null
    description: string
    purchaseLink: string | null
    releaseDate: string | null
  }>
  sessions: Array<{
    id: string
    title?: string
    description?: string
  }>
} | null>(null)

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// Load employee profile
const loadEmployee = async () => {
  if (!employeeId.value) {
    error.value = 'Employee ID is required'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const employee = await $fetch(`/api/users/${employeeId.value}`)
    
    // Normalize image URLs in publications (use runtime config so client gets correct base URL)
    if (employee.publications && Array.isArray(employee.publications)) {
      const config = useRuntimeConfig()
      const payloadBaseUrl = config.public.payloadBaseUrl || ''
      employee.publications = employee.publications.map((pub: any) => {
        if (pub.image?.url && !pub.image.url.startsWith('http') && payloadBaseUrl) {
          if (pub.image.url.startsWith('/')) {
            pub.image.url = `${payloadBaseUrl}${pub.image.url}`
          } else {
            pub.image.url = `${payloadBaseUrl}/${pub.image.url}`
          }
        }
        return pub
      })
    }
    
    employeeData.value = employee
  } catch (err: any) {
    console.error('Error loading employee:', err)
    if (err.statusCode === 404) {
      error.value = 'Employee not found'
    } else {
      error.value = err.data?.message || 'Failed to load profile'
    }
  } finally {
    loading.value = false
  }
}

// Load employee on mount
onMounted(() => {
  if (import.meta.client) {
    loadEmployee()
  }
})

// Reload if ID changes
watch(employeeId, () => {
  loadEmployee()
})
</script>

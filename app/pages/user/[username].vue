<template>
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-500">Loading profile...</div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-6">
      <div class="text-red-800">{{ error }}</div>
    </div>

    <div v-else-if="user" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <!-- Profile Header -->
      <div class="flex flex-col items-center text-center mb-8">
        <!-- Avatar -->
        <div class="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden mb-4">
          <img
            v-if="user.avatar?.url"
            :src="user.avatar.url"
            :alt="user.name"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-gray-600 font-semibold text-4xl">
            {{ user.name?.charAt(0).toUpperCase() }}
          </span>
        </div>

        <!-- Name -->
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ user.name }}</h1>
        
        <!-- Email/Username -->
        <p class="text-gray-500 text-sm">{{ user.email }}</p>
      </div>

      <!-- Bio Section -->
      <div v-if="user.bio" class="border-t border-gray-200 pt-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">About</h2>
        <p class="text-gray-700 whitespace-pre-wrap">{{ user.bio }}</p>
      </div>

      <div v-else class="border-t border-gray-200 pt-6 mb-6">
        <p class="text-gray-500 italic">No bio available.</p>
      </div>

      <!-- Employee profile: show when user has any employee data -->
      <div v-if="employeeProfileEntries.length > 0" class="border-t border-gray-200 pt-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Asbury Seminary Employee Profile</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <template v-for="entry in employeeProfileEntries" :key="entry.key">
            <dt class="text-sm font-medium text-gray-500">{{ entry.label }}</dt>
            <dd class="text-gray-900 text-sm">{{ entry.value }}</dd>
          </template>
        </dl>
      </div>

      <!-- Student Profile: only these slugs, in this order, with these labels -->
      <div v-if="alumniDegreeEntries.length > 0 || alumniContactEntries.length > 0" class="border-t border-gray-200 pt-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Alumni Profile</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <template v-for="entry in alumniDegreeEntries" :key="entry.key">
            <dt class="text-sm font-medium text-gray-500">{{ entry.label }}</dt>
            <dd class="text-gray-900 text-sm">{{ entry.value }}</dd>
          </template>
          <template v-for="entry in alumniContactEntries" :key="entry.key">
            <dt class="text-sm font-medium text-gray-500">{{ entry.label }}</dt>
            <dd class="text-gray-900 text-sm">{{ entry.value }}</dd>
          </template>
        </dl>
      </div>

      <!-- Student Profile: only these slugs, in this order, with these labels -->
      <div v-if="studentProfileEntries.length > 0" class="border-t border-gray-200 pt-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Student Profile</h2>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <template v-for="entry in studentProfileEntries" :key="entry.slug">
            <dt class="text-sm font-medium text-gray-500">{{ entry.label }}</dt>
            <dd class="text-gray-900 text-sm">{{ entry.value }}</dd>
          </template>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const username = computed(() => route.params.username as string)

const loading = ref(true)
const error = ref<string | null>(null)
const user = ref<{
  id: number
  name: string
  email: string
  bio: string | null
  avatar?: { url: string } | null
  employeeTitle?: string | null
  startDate?: string | null
  phone?: string | null
  location?: string | null
  department?: string | null
  section?: string | null
  alumniOptIn?: boolean
  alumniDegrees?: Array<{ degree?: string | null; graduationYear?: number | null }> | null
  alumniContact?: {
    email?: string | null
    phone?: string | null
    facebook?: string | null
    x?: string | null
    instagram?: string | null
  } | null
} | null>(null)

const studentProfile = ref<{ answers: Record<string, unknown>; updatedAt: string } | null>(null)

// Department/section labels for employee display (match employee edit page)
const DEPARTMENT_LABELS: Record<string, string> = {
  '1': 'Academic Affairs',
  '2': 'EMT',
  '3': 'Finance and Administration',
  '4': 'Office of the President',
  '5': 'Formation',
  '6': 'Advancement'
}

function formatSectionLabel(slug: string): string {
  if (!slug) return ''
  if (slug === 'lits') return 'LITS'
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function yearsEmployed(startDateStr: string): number | null {
  if (!startDateStr || startDateStr.length < 10) return null
  try {
    const start = new Date(startDateStr.slice(0, 10)).getTime()
    const now = Date.now()
    if (start > now) return null
    const years = (now - start) / (365.25 * 24 * 60 * 60 * 1000)
    return Math.round(years * 10) / 10 // one decimal
  } catch {
    return null
  }
}

const EMPLOYEE_FIELDS: { key: keyof NonNullable<typeof user.value>; label: string }[] = [
  { key: 'employeeTitle', label: 'Title' },
  { key: 'department', label: 'Department' },
  { key: 'section', label: 'Section' },
  { key: 'startDate', label: 'Start date' },
  { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'Location' }
]

const employeeProfileEntries = computed(() => {
  const u = user.value
  if (!u) return []
  return EMPLOYEE_FIELDS.filter(({ key }) => {
    const v = u[key]
    return v != null && String(v).trim() !== ''
  }).map(({ key, label }) => {
    const raw = u[key]
    let value = String(raw).trim()
    if (key === 'department') value = DEPARTMENT_LABELS[value] ?? value
    if (key === 'section') value = formatSectionLabel(value)
    if (key === 'startDate' && value.length >= 10) {
      try {
        const formatted = new Date(value.slice(0, 10)).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        const years = yearsEmployed(value)
        value = years != null ? `${formatted} (${years} years)` : formatted
      } catch {
        // keep value
      }
    }
    return { key, label, value }
  })
})

const alumniDegreeEntries = computed(() => {
  const entries = user.value?.alumniDegrees
  if (!Array.isArray(entries)) return []
  return entries
    .map((entry, index) => {
      const degree = String(entry.degree || '').trim()
      const year = entry.graduationYear
      if (!degree) return null
      return {
        key: `degree-${index}`,
        label: index === 0 ? 'Degrees' : ' ',
        value: year ? `${degree} (${year})` : degree,
      }
    })
    .filter((entry): entry is { key: string; label: string; value: string } => Boolean(entry))
})

const alumniContactEntries = computed(() => {
  if (!user.value?.alumniOptIn || !user.value?.alumniContact) return []
  const contact = user.value.alumniContact
  const rowConfig = [
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'x', label: 'X' },
    { key: 'instagram', label: 'Instagram' },
  ] as const

  return rowConfig
    .map((row) => {
      const value = String(contact[row.key] ?? '').trim()
      if (!value) return null
      return { key: row.key, label: row.label, value }
    })
    .filter((entry): entry is { key: string; label: string; value: string } => Boolean(entry))
})

// Control exactly which answers show, in what order, and with what label. Add/remove/reorder as needed.
const STUDENT_PROFILE_FIELDS: { slug: string; label: string }[] = [
  { slug: 'marital-status', label: 'Marital Status' },
  { slug: 'live', label: 'Lives in' },
  { slug: 'from', label: 'From' },
  { slug: 'grad-date', label: 'Expected Graduation Date' },
  { slug: 'asbury-start-date', label: 'Started at Asbury Seminary' },
  { slug: 'current-degree', label: 'Degree program' }
]

const studentProfileEntries = computed(() => {
  const answers = studentProfile.value?.answers
  if (!answers || typeof answers !== 'object') return []
  return STUDENT_PROFILE_FIELDS.filter(
    ({ slug }) => answers[slug] != null && String(answers[slug]).trim() !== ''
  ).map(({ slug, label }) => ({
    slug,
    label,
    value: formatSurveyValue(answers[slug], slug)
  }))
})

function formatSurveyValue(val: unknown, slug: string): string {
  if (val == null) return ''
  const s = String(val).trim()
  if (!s) return ''
  if (slug.includes('date') && s.length >= 10) {
    try {
      return new Date(s.slice(0, 10)).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    } catch {
      return s
    }
  }
  if (slug === 'marital-status') {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  }
  return s
}

// Load user profile
const loadUser = async () => {
  if (!username.value) {
    error.value = 'Username is required'
    loading.value = false
    return
  }

  try {
    loading.value = true
    error.value = null

    const [userData, surveyData] = await Promise.all([
      $fetch(`/api/users/by-username`, {
        query: { username: username.value }
      }),
      $fetch(`/api/user-survey-responses/public/${encodeURIComponent(username.value)}`).catch(() => null)
    ])

    user.value = userData
    studentProfile.value = surveyData as { answers: Record<string, unknown>; updatedAt: string } | null
  } catch (err: any) {
    console.error('Error loading user:', err)
    if (err.statusCode === 404) {
      error.value = 'User not found'
    } else {
      error.value = err.data?.message || 'Failed to load profile'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (import.meta.client) loadUser()
})

// Reload if username changes
watch(username, () => {
  loadUser()
})
</script>

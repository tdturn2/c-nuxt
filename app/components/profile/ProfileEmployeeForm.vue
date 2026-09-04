<template>
  <div>
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div class="text-red-800 text-sm">{{ error }}</div>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <div>
        <label for="employeeTitle" class="block text-sm font-medium text-gray-700 mb-2">
          Employee Title
        </label>
        <input
          id="employeeTitle"
          v-model="employeeTitle"
          type="text"
          class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label for="department" class="block text-sm font-medium text-gray-700 mb-2">
          Department
        </label>
        <select
          id="department"
          v-model="department"
          class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a department</option>
          <option v-for="d in departments" :key="d.value" :value="d.value">
            {{ d.label }}
          </option>
        </select>
      </div>

      <div>
        <label for="section" class="block text-sm font-medium text-gray-700 mb-2">
          Section
        </label>
        <select
          id="section"
          v-model="section"
          :disabled="!department || sectionOptions.length === 0"
          class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="">
            {{ !department ? 'Select a department first' : 'Select a section' }}
          </option>
          <option v-for="s in sectionOptions" :key="s" :value="s">
            {{ formatSectionLabel(s) }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div>
          <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label for="location" class="block text-sm font-medium text-gray-700 mb-2">
          Office Location (building and room number)
        </label>
        <input
          id="location"
          v-model="location"
          type="text"
          class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          :disabled="saving || !hasChanges"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ saving ? 'Saving...' : 'Save Employee Profile' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const { user: meUser, refresh } = useMe()

const saving = ref(false)
const error = ref<string | null>(null)
const initial = ref<any>(null)

const employeeTitle = ref('')
const section = ref('')
const department = ref('')
const startDate = ref('')
const phone = ref('')
const location = ref('')

const departments = [
  { label: 'Academic Affairs', value: '1' },
  { label: 'EMT', value: '2' },
  { label: 'Finance and Administration', value: '3' },
  { label: 'Office of the President', value: '4' },
  { label: 'Formation', value: '5' },
  { label: 'Advancement', value: '6' },
]

const departmentSections: Record<string, string[]> = {
  '1': [
    'advanced-research-programs',
    'asbury-latino-center',
    'center-for-church-multiplication',
    'school-of-biblical-interpretation',
    'school-of-theology-and-formation',
    'school-of-counseling',
    'esj-school-of-mission-and-ministry',
    'doctor-of-ministry',
    'lits',
    'institutional-effectiveness-and-assessment',
  ],
  '2': ['admissions', 'financial-aid', 'registrar', 'student-success'],
  '3': [
    'asbury-inn',
    'auxiliary-services',
    'employee-services',
    'facilities-and-security',
    'business-office',
  ],
  '4': ['presidents-office', 'executive-leadership'],
  '5': [
    'career-and-calling',
    'chapel-office',
    'community-formation',
    'global-formation',
    'student-life-and-formation',
  ],
  '6': ['alumni', 'communications', 'development', 'major-events'],
}

const sectionOptions = computed(() => {
  const dep = department.value
  if (!dep) return []
  return departmentSections[dep] || []
})

const formatSectionLabel = (slug: string) => {
  const key = slug.trim().toLowerCase()
  if (key === 'lits') return 'LITS'
  if (key === 'esj') return 'ESJ'
  return slug
    .split('-')
    .map((w) => {
      if (w.toLowerCase() === 'esj') return 'ESJ'
      if (w.toLowerCase() === 'lits') return 'LITS'
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

watch(department, (newDep) => {
  if (!newDep) {
    section.value = ''
    return
  }
  const allowed = departmentSections[newDep] || []
  if (section.value && !allowed.includes(section.value)) {
    section.value = ''
  }
})

const hasChanges = computed(() => {
  if (!initial.value) return false
  return (
    employeeTitle.value !== (initial.value.employeeTitle || '') ||
    section.value !== (initial.value.section || '') ||
    department.value !== (initial.value.department || '') ||
    startDate.value !== (initial.value.startDate || '') ||
    phone.value !== (initial.value.phone || '') ||
    location.value !== (initial.value.location || '')
  )
})

function applyUser(user: any) {
  initial.value = user
  employeeTitle.value = user.employeeTitle || ''
  section.value = user.section || ''
  department.value = user.department || ''
  startDate.value = user.startDate ? String(user.startDate).slice(0, 10) : ''
  phone.value = user.phone || ''
  location.value = user.location || ''
}

watch(meUser, (u) => {
  if (u) applyUser(u)
}, { immediate: true })

const handleSubmit = async () => {
  if (!hasChanges.value || saving.value) return
  try {
    saving.value = true
    error.value = null

    const updated: any = await $fetch('/api/employees/profile', {
      method: 'PATCH',
      body: {
        employeeTitle: employeeTitle.value.trim() || null,
        section: section.value.trim() || null,
        department: department.value.trim() || null,
        startDate: startDate.value || null,
        phone: phone.value.trim() || null,
        location: location.value.trim() || null,
      },
    })

    applyUser(updated)
    refresh()
  } catch (err: any) {
    console.error('Error updating staff profile:', err)
    error.value = err.data?.message || 'Failed to update profile'
  } finally {
    saving.value = false
  }
}
</script>

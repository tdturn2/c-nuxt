<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
  <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Employee Directory</h1>

    <div v-if="loading" class="text-center py-12">
      <div class="text-gray-500">Loading directory...</div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <div class="text-red-800 text-sm">{{ error }}</div>
    </div>

    <div v-else-if="employees.length === 0" class="text-gray-500 py-8">
      No staff or faculty found.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="emp in employees"
        :key="emp.id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col items-center text-center"
      >
        <div class="w-30 h-30 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center mb-3">
          <img
            v-if="emp.avatar?.url"
            :src="emp.avatar.url"
            :alt="emp.name"
            class="w-full h-full object-cover"
          />
          <span v-else class="text-gray-500 font-semibold text-2xl">
            {{ emp.name?.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="min-w-0 w-full">
          <h2 class="font-semibold text-gray-900 truncate">{{ emp.name }}</h2>
          <p v-if="emp.employeeTitle" class="text-sm text-gray-600 truncate">{{ emp.employeeTitle }}</p>
          <p v-if="emp.department" class="text-xs text-gray-500 mt-0.5">{{ departmentLabel(emp.department) }}</p>
          <p v-if="emp.section" class="text-xs text-gray-500">{{ sectionLabel(emp.section) }}</p>
        </div>
        <dl class="mt-3 pt-3 border-t border-gray-100 space-y-1 w-full text-left">
          <div v-if="emp.email" class="flex items-center gap-2 min-w-0">
            <UIcon name="i-heroicons-envelope" class="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a :href="`mailto:${emp.email}`" class="text-sm text-[rgba(13,94,130,1)] hover:underline truncate">{{ emp.email }}</a>
          </div>
          <div v-if="emp.phone" class="flex items-center gap-2">
            <UIcon name="i-heroicons-phone" class="w-4 h-4 text-gray-400 flex-shrink-0" />
            <a :href="`tel:${emp.phone}`" class="text-sm text-gray-700">{{ emp.phone }}</a>
          </div>
        </dl>
      </div>
    </div>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const loading = ref(true)
const error = ref<string | null>(null)
const employees = ref<Array<{
  id: number
  name: string
  email: string | null
  employeeTitle: string | null
  department: string | null
  section: string | null
  phone: string | null
  avatar: { url: string } | null
}>>([])

const DEPARTMENT_LABELS: Record<string, string> = {
  '1': 'Academic Affairs',
  '2': 'EMT',
  '3': 'Finance and Administration',
  '4': 'Office of the President',
  '5': 'Formation',
  '6': 'Advancement'
}

function departmentLabel(id: string | null): string {
  if (!id) return ''
  return DEPARTMENT_LABELS[id] ?? id
}

function sectionLabel(slug: string | null): string {
  if (!slug) return ''
  if (slug === 'lits') return 'LITS'
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

onMounted(async () => {
  if (!import.meta.client) return
  try {
    loading.value = true
    error.value = null
    const res = await $fetch<{ employees: typeof employees.value }>('/api/employees')
    employees.value = res.employees ?? []
  } catch (err: any) {
    console.error('Error loading employees:', err)
    error.value = err.data?.message || 'Failed to load directory'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Employee Directory</h1>

        <template v-if="loading">
          <p class="sr-only">Loading employee directory…</p>
          <ConnectDirectorySkeleton toolbar="filters" />
        </template>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="text-red-800 text-sm">{{ error }}</div>
        </div>

        <div v-else>
          <div v-if="employees.length === 0" class="text-gray-500 py-8">
            No staff or faculty found.
          </div>

          <template v-else>
            <div class="flex flex-wrap items-end gap-3 sm:gap-4 mb-6">
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <label for="emp-dept" class="text-sm font-medium text-gray-700">Department</label>
                <USelectMenu
                  id="emp-dept"
                  v-model="selectedDepartment"
                  :items="departmentOptions"
                  value-attribute="value"
                  label-attribute="label"
                  class="w-full min-w-[10rem] sm:w-56"
                  placeholder="All departments"
                />
              </div>
              <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                <label for="emp-section" class="text-sm font-medium text-gray-700">Section</label>
                <USelectMenu
                  id="emp-section"
                  v-model="selectedSection"
                  :items="sectionOptions"
                  value-attribute="value"
                  label-attribute="label"
                  class="w-full min-w-[10rem] sm:w-56"
                  placeholder="All sections"
                />
              </div>
              <div class="w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
                <label for="emp-search" class="sr-only">Search by name</label>
                <input
                  id="emp-search"
                  v-model="searchQuery"
                  type="search"
                  placeholder="Search by name..."
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                  autocomplete="off"
                />
              </div>
            </div>

            <div v-if="filteredEmployees.length === 0" class="text-gray-500 py-8">
              No employees match your filters.
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div
                v-for="emp in filteredEmployees"
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
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'

type EmployeeRow = {
  id: number
  name: string
  email: string | null
  employeeTitle: string | null
  department: string | null
  section: string | null
  phone: string | null
  avatar: { url: string } | null
}

const route = useRoute()
const router = useRouter()

const searchQuery = ref('')

const { data: employeesPayload, pending: loading, error: fetchError } = useLazyFetch<{ employees: EmployeeRow[] }>(
  '/api/employees',
)

const employees = computed(() => employeesPayload.value?.employees ?? [])

const error = computed(() => {
  const e = fetchError.value as any
  if (!e) return null
  return e.data?.message || e.statusMessage || 'Failed to load directory'
})

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

const departmentOptions = computed(() => {
  const opts: { label: string; value: string }[] = [{ label: 'All departments', value: '' }]
  const seen = new Set<string>()
  for (const emp of employees.value) {
    const id = emp.department?.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    opts.push({ label: DEPARTMENT_LABELS[id] ?? id, value: id })
  }
  opts.sort((a, b) => (a.value === '' ? -1 : b.value === '' ? 1 : a.label.localeCompare(b.label)))
  return opts
})

const sectionOptions = computed(() => {
  const opts: { label: string; value: string }[] = [{ label: 'All sections', value: '' }]
  const seen = new Set<string>()
  for (const emp of employees.value) {
    const slug = emp.section?.trim()
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    opts.push({ label: sectionLabel(slug), value: slug })
  }
  opts.sort((a, b) => (a.value === '' ? -1 : b.value === '' ? 1 : a.label.localeCompare(b.label)))
  return opts
})

const selectedDepartment = ref<{ label: string; value: string }>({ label: 'All departments', value: '' })
const selectedSection = ref<{ label: string; value: string }>({ label: 'All sections', value: '' })

const filteredEmployees = computed(() => {
  let list = employees.value
  const dept = selectedDepartment.value?.value
  if (dept) {
    list = list.filter((e) => (e.department ?? '').trim() === dept)
  }
  const sec = selectedSection.value?.value
  if (sec) {
    list = list.filter((e) => (e.section ?? '').trim() === sec)
  }
  const words = searchQuery.value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return list
  return list.filter((e) => {
    const name = (e.name ?? '').toLowerCase()
    return words.every((word) => name.includes(word))
  })
})

/** Shareable filters: department id, section slug, optional name search (`q` or legacy `name`). */
function parseQuery(q: typeof route.query) {
  const department = typeof q.department === 'string' ? q.department.trim() : ''
  const section = typeof q.section === 'string' ? q.section.trim() : ''
  const name =
    typeof q.q === 'string'
      ? q.q
      : typeof q.name === 'string'
        ? q.name
        : ''
  return { department, section, name }
}

function queryRecordFromState(): Record<string, string> {
  const out: Record<string, string> = {}
  if (selectedDepartment.value?.value) out.department = selectedDepartment.value.value
  if (selectedSection.value?.value) out.section = selectedSection.value.value
  if (searchQuery.value.trim()) out.q = searchQuery.value.trim()
  return out
}

function queryRecordFromRoute(q: typeof route.query): Record<string, string> {
  const { department, section, name } = parseQuery(q)
  const out: Record<string, string> = {}
  if (department) out.department = department
  if (section) out.section = section
  if (name.trim()) out.q = name.trim()
  return out
}

function equalQuery(a: Record<string, string>, b: Record<string, string>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    if ((a[k] ?? '') !== (b[k] ?? '')) return false
  }
  return true
}

function applyQueryToFilters() {
  const { department, section, name } = parseQuery(route.query)
  const deptOpt = department
    ? { label: DEPARTMENT_LABELS[department] ?? department, value: department }
    : { label: 'All departments', value: '' }
  if (selectedDepartment.value.value !== deptOpt.value) {
    selectedDepartment.value = deptOpt
  }
  const secOpt = section
    ? { label: sectionLabel(section), value: section }
    : { label: 'All sections', value: '' }
  if (selectedSection.value.value !== secOpt.value) {
    selectedSection.value = secOpt
  }
  if (searchQuery.value !== name) {
    searchQuery.value = name
  }
}

watch(
  () => route.query,
  () => {
    applyQueryToFilters()
  },
  { immediate: true, deep: true }
)

function syncRouteFromFilters() {
  const next = queryRecordFromState()
  const cur = queryRecordFromRoute(route.query)
  if (equalQuery(next, cur)) return
  router.replace({ path: route.path, query: next })
}

watch([selectedDepartment, selectedSection], syncRouteFromFilters, { deep: true })
watchDebounced(searchQuery, syncRouteFromFilters, { debounce: 400 })

watch(fetchError, (e) => {
  if (e) console.error('Error loading employees:', e)
})
</script>

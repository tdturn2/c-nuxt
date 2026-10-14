<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Student Degree Maps</h1>
          <p class="mt-1 text-sm text-gray-600">
            Review degree maps for students who have started one. This view is read-only.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canViewMaps"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to student degree maps. Access is limited to the academic-advisor group and Connect admins.
        </div>
        <template v-else>
          <div class="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <label for="student-degree-map-picker" class="block text-sm font-medium text-gray-900">
              Student
            </label>
            <p class="mt-0.5 mb-3 text-xs text-gray-500">
              Only students who have created a degree map appear in this list.
            </p>
            <div v-if="studentsPending" class="text-sm text-gray-500">Loading students...</div>
            <div
              v-else-if="studentsError"
              class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {{ studentsError }}
            </div>
            <div v-else-if="!studentItems.length" class="text-sm text-gray-600">
              No students have started a degree map yet.
            </div>
            <USelectMenu
              v-else
              id="student-degree-map-picker"
              v-model="selectedStudentId"
              :items="studentItems"
              value-key="value"
              label-key="label"
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-lucide-search"
              placeholder="Search students…"
              :search-input="{ placeholder: 'Search by name, email, or degree…', icon: 'i-lucide-search' }"
              class="w-full max-w-xl"
            />
          </div>

          <div v-if="!hasSelectedStudent" class="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            Choose a student to see their degree map.
          </div>
          <div v-else-if="planPending" class="py-8 text-gray-500">Loading degree map...</div>
          <div
            v-else-if="planError"
            class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm"
          >
            {{ planError }}
          </div>
          <div v-else-if="!plans.length" class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            This student does not have a degree map to show.
          </div>
          <template v-else>
            <div class="mb-4">
              <h2 class="text-lg font-semibold text-gray-900">{{ selectedStudentLabel }}</h2>
              <p v-if="selectedStudent?.email" class="text-sm text-gray-500">{{ selectedStudent.email }}</p>
            </div>

            <div v-if="plans.length === 1">
              <UserDegreePlanBody :plan="plans[0]!" readonly />
            </div>
            <div v-else class="space-y-4">
              <details
                v-for="(planItem, idx) in plans"
                :key="planItem.id ?? idx"
                class="group rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md"
                :open="idx === 0"
              >
                <summary
                  class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left font-semibold text-gray-900 [&::-webkit-details-marker]:hidden"
                >
                  <span>{{ planSummaryTitle(planItem) }}</span>
                  <UIcon
                    name="i-heroicons-chevron-down"
                    class="h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div class="border-t border-gray-200 px-4 pb-4 pt-2">
                  <UserDegreePlanBody :plan="planItem" readonly />
                </div>
              </details>
            </div>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { DegreePlan } from '~/components/user/DegreePlanBody.vue'

type StudentPlanSummary = {
  id: number
  status: string
  degreeName: string
  catalogYear: number | null
  specializationName: string | null
}

type StudentOption = {
  id: number
  name: string
  email: string
  plans: StudentPlanSummary[]
}

const { mePending, canAccessSection } = useDashboardAccess()
const canViewMaps = computed(() => canAccessSection('student-degree-maps'))

const {
  data: studentsData,
  pending: studentsPending,
  error: studentsFetchError,
} = useFetch<{ students?: StudentOption[] }>('/api/dashboard/student-degree-maps', {
  key: 'dashboard-student-degree-maps',
})

const students = computed(() => (Array.isArray(studentsData.value?.students) ? studentsData.value.students : []))

const studentsError = computed(() => {
  const err = studentsFetchError.value as { data?: { message?: string }; message?: string } | null
  if (!err) return ''
  return err.data?.message || err.message || 'Could not load students.'
})

function studentSearchLabel(student: StudentOption) {
  const maps = student.plans
    .map((plan) => {
      const concentration = plan.specializationName ? ` · ${plan.specializationName}` : ''
      return `${plan.degreeName}${concentration}`
    })
    .join(', ')
  const who = student.email ? `${student.name} (${student.email})` : student.name
  return `${who} — ${maps || 'Degree map'}`
}

const studentItems = computed(() =>
  students.value.map((student) => ({
    label: studentSearchLabel(student),
    value: student.id,
  })),
)

const selectedStudentId = ref<number | null>(null)

function asStudentId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  if (value && typeof value === 'object' && 'value' in value) {
    return asStudentId((value as { value: unknown }).value)
  }
  return null
}

const hasSelectedStudent = computed(() => asStudentId(selectedStudentId.value) != null)

const selectedStudent = computed(() => {
  const id = asStudentId(selectedStudentId.value)
  if (id == null) return null
  return students.value.find((student) => student.id === id) ?? null
})

const selectedStudentLabel = computed(() => selectedStudent.value?.name || 'Student')

const planData = ref<{ plans?: DegreePlan[]; docs?: DegreePlan[] } | null>(null)
const planPending = ref(false)
const planFetchError = ref<{ data?: { message?: string; error?: string }; message?: string } | null>(null)

let planRequest = 0
watch(selectedStudentId, async () => {
  const id = asStudentId(selectedStudentId.value)
  const request = ++planRequest
  planData.value = null
  planFetchError.value = null
  if (id == null) {
    planPending.value = false
    return
  }
  planPending.value = true
  try {
    const result = await $fetch<{ plans?: DegreePlan[]; docs?: DegreePlan[] }>(
      `/api/dashboard/student-degree-maps/${id}`,
    )
    if (request !== planRequest) return
    planData.value = result
  } catch (err: any) {
    if (request !== planRequest) return
    planFetchError.value = err
  } finally {
    if (request === planRequest) planPending.value = false
  }
})

const plans = computed(() => {
  const docs = planData.value?.plans ?? planData.value?.docs
  return Array.isArray(docs) ? docs : []
})

const planError = computed(() => {
  const err = planFetchError.value
  if (!err) return ''
  return err.data?.message || err.data?.error || err.message || 'Could not load this degree map.'
})

function planSummaryTitle(plan: DegreePlan) {
  const degree = plan?.degree
  const base = degree?.name ?? plan?.title ?? (plan as { name?: string }).name ?? 'Degree Plan'
  const concentration = plan?.specialization?.name?.trim()
  return concentration ? `${base} · ${concentration}` : base
}
</script>

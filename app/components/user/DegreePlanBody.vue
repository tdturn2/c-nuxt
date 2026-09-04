<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ planTitle }}
          </h2>
          <p v-if="degreeTotalCredits" class="mt-0.5 text-sm text-gray-500">
            Total credit hours required: {{ degreeTotalCredits }}
            <span v-if="remainingCredits != null" class="ml-3 text-gray-700">
              Credit hours remaining:
              <span class="font-semibold">{{ remainingCredits }}</span>
            </span>
          </p>
          <p class="mt-0.5 text-sm text-gray-500">
            Residential hours completed:
            <span class="font-medium text-gray-800">{{ residentialHoursCompleted }}</span>
            <span class="ml-3 text-gray-500">
              Non-residential hours completed:
              <span class="font-medium text-gray-800">{{ nonResidentialHoursCompleted }}</span>
            </span>
          </p>
          <div v-if="planProgress" class="mt-4">
            <div class="flex items-center justify-between text-xs text-gray-600 mb-1.5">
              <span>Overall progress</span>
              <span class="font-medium text-gray-800">
                {{ planProgress.percent }}% • {{ planProgress.earned }} / {{ planProgress.total }} hours
              </span>
            </div>
            <div class="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-500 transition-all duration-500"
                :style="{ width: planProgress.percent + '%' }"
              />
            </div>
          </div>
          <div
            v-if="planDescription"
            class="mt-3 text-gray-600 prose prose-sm max-w-none"
            v-html="planDescription"
          />
        </div>
        <div v-if="catalogYear" class="shrink-0">
          <span
            class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 shadow-sm"
          >
            Catalog year
            <span class="ml-1 font-bold">{{ catalogYear }}</span>
          </span>
        </div>
      </div>
    </div>

    <div
      v-for="section in sections"
      :key="section.id"
      class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h3 class="text-lg font-semibold text-gray-900">
        {{ section.name }}
      </h3>
      <p v-if="section.creditsRequired != null" class="mt-0.5 text-sm text-gray-500">
        {{ section.creditsRequired }} credits required
      </p>
      <div class="mt-3 overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Course</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Semester/Year<br />Completed</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Hours<br />Required</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Hours<br />Earned</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Hours<br />Type</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Notes</th>
              <th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th class="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            <tr
              v-for="(item, i) in section.items"
              :key="item.id ?? i"
              :class="[
                'hover:bg-gray-50 transition',
                isItemCompleted(item) ? 'bg-emerald-50/70 border-l-4 border-l-emerald-400' : '',
              ]"
            >
              <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ courseCode(item) }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">
                <UPopover
                  v-if="courseDescription(item)"
                  :popper="{ placement: 'top', strategy: 'fixed' }"
                  :content="{ align: 'start', side: 'top', sideOffset: 8 }"
                >
                  <button
                    type="button"
                    class="inline-flex text-left hover:underline decoration-dotted decoration-gray-400"
                  >
                    {{ courseTitle(item) }}
                  </button>
                  <template #content>
                    <div
                      class="max-w-[500px] p-3 rounded-md bg-white text-sm text-gray-800 shadow-lg border border-gray-200 whitespace-pre-line"
                    >
                      {{ courseDescription(item) }}
                    </div>
                  </template>
                </UPopover>
                <span v-else>{{ courseTitle(item) }}</span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ formattedTerm(item) }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ courseCredits(item) }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ courseHoursEarned(item) }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">{{ courseHoursType(item) }}</td>
              <td class="px-4 py-3 text-sm text-gray-600">
                <UPopover
                  v-if="courseNotes(item)"
                  :popper="{ placement: 'top', strategy: 'fixed' }"
                  :content="{ align: 'start', side: 'top', sideOffset: 8 }"
                >
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    aria-label="View notes"
                  >
                    <UIcon name="i-heroicons-document-text" class="h-4 w-4" />
                  </button>
                  <template #content>
                    <div
                      class="max-w-[400px] p-3 rounded-md bg-white text-sm text-gray-800 shadow-lg border border-gray-200 whitespace-pre-line"
                    >
                      {{ courseNotes(item) }}
                    </div>
                  </template>
                </UPopover>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                <div class="flex items-center justify-center">
                  <UIcon
                    :name="isItemCompleted(item) ? 'i-heroicons-check-circle-solid' : 'i-heroicons-clock'"
                    :class="isItemCompleted(item) ? 'h-4 w-4 text-emerald-500' : 'h-4 w-4 text-gray-400'"
                    aria-hidden="true"
                  />
                </div>
              </td>
              <td class="px-2 py-3 text-right">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="Edit course"
                  @click="$emit('edit-course', item)"
                >
                  <UIcon name="i-heroicons-pencil-square" class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="rounded-lg border-2 border-red-200 bg-red-50 p-5 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h3 class="flex items-center gap-2 text-base font-semibold text-red-800">
            <UIcon name="i-lucide-trash-2" class="h-5 w-5 shrink-0" aria-hidden="true" />
            Delete this degree map
          </h3>
          <p class="mt-1.5 text-sm text-red-700/90 max-w-xl">
            Permanently remove this map and every course line you have entered on it
            (terms, hours earned, notes, and status). This cannot be undone.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          :disabled="deleting"
          @click="showDeleteConfirm = true"
        >
          <UIcon name="i-lucide-trash-2" class="h-4 w-4" aria-hidden="true" />
          Delete degree map
        </button>
      </div>
    </div>

    <UModal v-model:open="showDeleteConfirm" :ui="{ content: 'max-w-md' }">
      <template #header>
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <UIcon name="i-lucide-triangle-alert" class="h-5 w-5 text-red-600" />
          </span>
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-gray-900">Delete degree map?</h2>
            <p class="mt-0.5 text-sm text-gray-500">
              {{ planTitle }}
            </p>
          </div>
        </div>
      </template>

      <template #body>
        <div class="space-y-3 text-sm text-gray-700">
          <p>
            Are you sure you want to delete this degree map? This action
            <span class="font-semibold text-red-700">cannot be undone</span>.
          </p>
          <ul class="list-disc space-y-1.5 pl-5 text-gray-600">
            <li>The entire degree map will be removed from your account.</li>
            <li>All class data on this map will be permanently deleted (completed courses, hours, terms, notes, and status).</li>
            <li>You can create a new map later, but none of this data will come back.</li>
          </ul>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full flex-col gap-3">
          <p v-if="deleteError" class="text-sm text-red-600">{{ deleteError }}</p>
          <div class="flex w-full justify-end gap-2">
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              :disabled="deleting"
              @click="showDeleteConfirm = false"
            >
              Keep map
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              :disabled="deleting"
              @click="confirmDelete"
            >
              <UIcon v-if="deleting" name="i-lucide-loader-circle" class="h-4 w-4 animate-spin" />
              {{ deleting ? 'Deleting…' : 'Yes, delete permanently' }}
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
export interface DegreeItem {
  id?: number
  course?: { code?: string; title?: string; credits?: number; description?: string }
  record?: {
    status?: string
    term?: string
    grade?: string | null
    hoursEarned?: number
    hoursType?: string
    substitutionNotes?: string | null
    [key: string]: any
  }
  status?: string
  term?: string
  grade?: string | null
  hoursEarned?: number
  hoursType?: string
  substitutionNotes?: string | null
  credits?: number
  label?: string
  title?: string
  [key: string]: any
}

export interface DegreeSection {
  id?: number
  name?: string
  creditsRequired?: number
  order?: number
  items?: DegreeItem[]
}

export interface DegreePlan {
  id?: number
  degree?: { name?: string; displayLabel?: string; catalogYear?: number; description?: string; totalCredits?: number }
  sections?: DegreeSection[]
  [key: string]: any
}

const props = defineProps<{
  plan: DegreePlan
}>()

const emit = defineEmits<{
  'edit-course': [item: DegreeItem]
  deleted: [plan: DegreePlan]
}>()

const showDeleteConfirm = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

watch(showDeleteConfirm, (open) => {
  if (!open) {
    deleteError.value = null
    deleting.value = false
  }
})

async function confirmDelete() {
  const id = props.plan?.id ?? (props.plan as any)?.id
  if (id == null || !Number.isFinite(Number(id))) {
    deleteError.value = 'Missing degree map id.'
    return
  }

  deleting.value = true
  deleteError.value = null
  try {
    await $fetch(`/api/student-degree-plans/${id}`, { method: 'DELETE' })
    showDeleteConfirm.value = false
    emit('deleted', props.plan)
  } catch (e: any) {
    console.error('Failed to delete degree map', e)
    deleteError.value = e?.data?.message || e?.message || 'Could not delete degree map.'
  } finally {
    deleting.value = false
  }
}

const planTitle = computed(() => {
  const d = props.plan?.degree
  return d?.name ?? props.plan?.title ?? (props.plan as any)?.name ?? 'Degree Plan'
})

const catalogYear = computed(() => {
  const d = props.plan?.degree
  const v = d?.catalogYear ?? props.plan?.catalogYear ?? (props.plan as any)?.catalog_year
  return v != null ? String(v) : null
})

const degreeTotalCredits = computed(() => {
  const v = props.plan?.degree?.totalCredits
  return v != null ? Number(v) : null
})

const planDescription = computed(() => {
  const d = props.plan?.degree
  const html = d?.description ?? props.plan?.description ?? (props.plan as any)?.content
  return typeof html === 'string' && html ? html : ''
})

const sections = computed<DegreeSection[]>(() => {
  const raw = props.plan?.sections
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s) => Array.isArray(s?.items) && s.items && s.items.length > 0)
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
})

function isHoursTypeResidential(item: DegreeItem) {
  const raw = (item.record?.hoursType ?? item.hoursType ?? (item as any).hours_type ?? '') as string
  if (!raw) return false
  const v = raw.toLowerCase()
  return v === 'residential' || v === 'r'
}

function isHoursTypeNonResidential(item: DegreeItem) {
  const raw = (item.record?.hoursType ?? item.hoursType ?? (item as any).hours_type ?? '') as string
  if (!raw) return false
  const v = raw.toLowerCase()
  return (
    v === 'non-residential' ||
    v === 'nonresidential' ||
    v === 'non_residential' ||
    v === 'online' ||
    v === 'n'
  )
}

const totalHoursEarned = computed(() => {
  let sum = 0
  for (const section of sections.value) {
    for (const item of section.items || []) {
      const r = item.record
      const v = r?.hoursEarned ?? item.hoursEarned
      if (typeof v === 'number') sum += v
    }
  }
  return sum
})

const remainingCredits = computed(() => {
  if (degreeTotalCredits.value == null) return null
  const remaining = degreeTotalCredits.value - totalHoursEarned.value
  return remaining > 0 ? remaining : 0
})

const planProgress = computed(() => {
  if (!degreeTotalCredits.value || degreeTotalCredits.value <= 0) return null

  const earned = totalHoursEarned.value
  const total = degreeTotalCredits.value
  const rawPercent = (earned / total) * 100
  const percent = Math.max(0, Math.min(100, Math.round(rawPercent)))

  return {
    percent,
    earned,
    total,
  }
})

const residentialHoursCompleted = computed(() => {
  let sum = 0
  for (const section of sections.value) {
    for (const item of section.items || []) {
      if (!isHoursTypeResidential(item)) continue
      const v = item.record?.hoursEarned ?? item.hoursEarned
      if (typeof v === 'number') sum += v
    }
  }
  return sum
})

const nonResidentialHoursCompleted = computed(() => {
  let sum = 0
  for (const section of sections.value) {
    for (const item of section.items || []) {
      if (!isHoursTypeNonResidential(item)) continue
      const v = item.record?.hoursEarned ?? item.hoursEarned
      if (typeof v === 'number') sum += v
    }
  }
  return sum
})

function courseCode(item: DegreeItem) {
  const c = item.course
  return (c && c.code) ?? item.code ?? '—'
}

function courseTitle(item: DegreeItem) {
  const c = item.course
  return (c && (c.title ?? c.description)) ?? item.label ?? item.title ?? '—'
}

function courseDescription(item: DegreeItem) {
  const c = item.course
  const rec = item.record as any
  return (c && c.description) ?? rec?.description ?? (item as any).description ?? ''
}

function courseCredits(item: DegreeItem) {
  const c = item.course
  const v = (c && c.credits) ?? item.credits
  return v != null ? String(v) : '—'
}

function formattedTerm(item: DegreeItem) {
  const rec = item.record
  const term = rec?.term ?? item.term
  if (!term || typeof term !== 'string') return '—'
  const code = term.slice(0, 2).toUpperCase()
  const yearPart = term.slice(2)
  const yearNum = Number.isFinite(Number(yearPart)) ? 2000 + Number(yearPart) : null
  const season =
    code === 'FA' ? 'Fall' : code === 'SP' ? 'Spring' : code === 'SU' ? 'Summer' : code

  const base = yearNum ? `${season} ${yearNum}` : term

  const r = item.record as any
  const completedCode =
    r?.completedCourseCode ??
    r?.offeringFullClassId ??
    r?.offeringCode ??
    r?.completedCourseId ??
    r?.passedCourseCode ??
    r?.passedCourseId ??
    r?.offeringId ??
    null

  if (completedCode) return `${base} (${String(completedCode)})`

  const status = (r?.status ?? item.status ?? '').toString().toLowerCase()
  if (status === 'completed' || status === 'complete') {
    const codeForCompleted = courseCode(item)
    if (codeForCompleted && codeForCompleted !== '—') return `${base} (${codeForCompleted})`
  }

  return base
}

function courseHoursEarned(item: DegreeItem) {
  const r = item.record
  const v = r?.hoursEarned ?? item.hoursEarned ?? null
  return v != null ? String(v) : '—'
}

function courseHoursType(item: DegreeItem) {
  const r = item.record
  const raw = (r?.hoursType ?? item.hoursType ?? (item as any).hours_type ?? '') as string
  if (!raw) return '—'
  const v = raw.toLowerCase()
  if (v === 'residential' || v === 'r') return 'R'
  if (v === 'non-residential' || v === 'nonresidential' || v === 'online' || v === 'n') return 'N'
  return raw
}

function courseNotes(item: DegreeItem) {
  const r = item.record
  return (
    r?.substitutionNotes ??
    (r as any)?.notes ??
    (r as any)?.note ??
    item.substitutionNotes ??
    (item as any).notes ??
    (item as any).note ??
    ''
  )
}

function isItemCompleted(item: DegreeItem) {
  const required = item.course?.credits ?? item.credits
  const earned = item.record?.hoursEarned ?? item.hoursEarned
  if (required == null || earned == null) return false
  return Number(earned) >= Number(required)
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ planTitle }}
          </h2>
          <p v-if="concentrationName" class="mt-0.5 text-sm font-medium text-[rgba(13,94,130,1)]">
            {{ concentrationName }}
          </p>
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
      class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div class="min-w-0">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ section.name }}
          </h3>
          <p v-if="section.creditsRequired != null" class="mt-0.5 text-xs text-gray-500">
            {{ formatHours(sectionCountedHours(section)) }} of {{ formatHours(Number(section.creditsRequired)) }} hours counting
          </p>
        </div>
        <span
          v-if="section.creditsRequired != null"
          class="inline-flex items-center rounded-full bg-[rgba(13,94,130,0.08)] px-2.5 py-1 text-xs font-semibold text-[rgba(13,94,130,1)]"
        >
          {{ section.creditsRequired }} credits required
        </span>
      </div>
      <div
        v-if="section.copy"
        class="mx-5 mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
      >
        <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Requirements
        </p>
        <div v-if="section.copy.paragraphs.length" class="mt-1.5 space-y-2">
          <p
            v-for="(paragraph, index) in section.copy.paragraphs"
            :key="index"
            class="text-sm leading-6 text-gray-700"
            :class="index === 0 && paragraph.length < 48 && section.copy.paragraphs.length > 1 ? 'font-medium text-gray-900' : ''"
          >
            {{ paragraph }}
          </p>
        </div>
        <div
          v-if="section.copy.note || section.copy.codes.length"
          :class="section.copy.paragraphs.length ? 'mt-3 border-t border-gray-200 pt-3' : 'mt-1.5'"
        >
          <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Note
          </p>
          <p v-if="section.copy.note" class="mt-1 text-sm leading-6 text-gray-700">
            {{ section.copy.note }}
          </p>
          <ul v-if="section.copy.codes.length" class="mt-2 flex flex-wrap gap-1.5">
            <li
              v-for="(code, index) in section.copy.codes"
              :key="`${code}-${index}`"
              class="rounded-md bg-white px-2 py-1 font-mono text-xs font-medium text-gray-800 ring-1 ring-gray-200"
            >
              {{ code }}
            </li>
          </ul>
        </div>
      </div>
      <div v-if="section.items?.length" class="overflow-x-auto border-t border-gray-200">
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
            <template v-for="row in sectionRows(section)" :key="row.key">
              <tr v-if="row.kind === 'bucket'" class="bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-400">—</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                  <UPopover
                    v-if="courseDescription(row.item)"
                    :popper="{ placement: 'top', strategy: 'fixed' }"
                    :content="{ align: 'start', side: 'top', sideOffset: 8 }"
                  >
                    <button type="button" class="inline-flex text-left hover:underline decoration-dotted decoration-gray-400">
                      {{ courseTitle(row.item) }}
                    </button>
                    <template #content>
                      <div class="max-w-[500px] p-3 rounded-md bg-white text-sm text-gray-800 shadow-lg border border-gray-200 whitespace-pre-line">
                        {{ courseDescription(row.item) }}
                      </div>
                    </template>
                  </UPopover>
                  <span v-else>{{ courseTitle(row.item) }}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-400">—</td>
                <td class="px-4 py-3 text-sm text-gray-700">{{ row.required != null ? formatHours(row.required) : '—' }}</td>
                <td
                  class="px-4 py-3 text-sm"
                  :class="row.required != null && row.filled > row.required ? 'font-medium text-amber-700' : 'text-gray-700'"
                >
                  {{ bucketHoursLabel(row) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-400">—</td>
                <td class="px-4 py-3 text-sm text-gray-400">—</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  <div class="flex items-center justify-center">
                    <UIcon
                      :name="bucketComplete(row) ? 'i-heroicons-check-circle-solid' : 'i-heroicons-clock'"
                      :class="bucketComplete(row) ? 'h-4 w-4 text-emerald-500' : 'h-4 w-4 text-gray-400'"
                      aria-hidden="true"
                    />
                  </div>
                </td>
                <td class="px-2 py-3" />
              </tr>
              <tr v-else-if="row.kind === 'add'">
                <td colspan="9" class="px-4 py-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-sm font-medium text-[rgba(13,94,130,1)] hover:underline"
                    @click="$emit('edit-course', newElectiveLine(row.item))"
                  >
                    <UIcon name="i-heroicons-plus" class="h-4 w-4" />
                    Add a course
                  </button>
                </td>
              </tr>
              <tr
                v-else
                :class="[
                  'hover:bg-gray-50 transition',
                  isItemCompleted(row.item) ? 'bg-emerald-50/70 border-l-4 border-l-emerald-400' : '',
                ]"
              >
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{{ courseCode(row.item) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  <UPopover
                    v-if="courseDescription(row.item)"
                    :popper="{ placement: 'top', strategy: 'fixed' }"
                    :content="{ align: 'start', side: 'top', sideOffset: 8 }"
                  >
                    <button
                      type="button"
                      class="inline-flex text-left hover:underline decoration-dotted decoration-gray-400"
                    >
                      {{ courseTitle(row.item) }}
                    </button>
                    <template #content>
                      <div
                        class="max-w-[500px] p-3 rounded-md bg-white text-sm text-gray-800 shadow-lg border border-gray-200 whitespace-pre-line"
                      >
                        {{ courseDescription(row.item) }}
                      </div>
                    </template>
                  </UPopover>
                  <span v-else>{{ courseTitle(row.item) }}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ formattedTerm(row.item) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ courseCredits(row.item) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  <span :title="countedHoursTitle(row)">
                    {{ row.kind === 'elective' || row.kind === 'course' ? countedHoursLabel(row) : courseHoursEarned(row.item) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ courseHoursType(row.item) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  <UPopover
                    v-if="courseNotes(row.item)"
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
                        {{ courseNotes(row.item) }}
                      </div>
                    </template>
                  </UPopover>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  <div class="flex items-center justify-center">
                    <UIcon
                      :name="isItemCompleted(row.item) ? 'i-heroicons-check-circle-solid' : 'i-heroicons-clock'"
                      :class="isItemCompleted(row.item) ? 'h-4 w-4 text-emerald-500' : 'h-4 w-4 text-gray-400'"
                      aria-hidden="true"
                    />
                  </div>
                </td>
                <td class="px-2 py-3 text-right">
                  <div class="inline-flex items-center">
                    <button
                      v-if="row.item.electiveLine && row.item.record?.id"
                      type="button"
                      class="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-red-700 hover:bg-red-50"
                      aria-label="Remove course"
                      @click="$emit('remove-course', row.item)"
                    >
                      <UIcon name="i-heroicons-trash" class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      aria-label="Edit course"
                      @click="$emit('edit-course', row.item)"
                    >
                      <UIcon name="i-heroicons-pencil-square" class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
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
import {
  appliedElectiveHours,
  countTowardLimit,
  electiveLineView,
  isCompletedRecord,
  electiveRecords,
  formatHours,
  isElectiveBucket,
  type ElectiveRecord,
} from '@shared/degreeMapElectives'
import { parseSectionCopy, type SectionCopy } from '@shared/degreeMapSectionCopy'

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
  description?: string | null
  order?: number
  items?: DegreeItem[]
}

export interface DegreePlan {
  id?: number
  degree?: { name?: string; displayLabel?: string; catalogYear?: number; description?: string; totalCredits?: number }
  specialization?: { id?: number; name?: string } | null
  sections?: DegreeSection[]
  [key: string]: any
}

const props = defineProps<{
  plan: DegreePlan
}>()

const emit = defineEmits<{
  'edit-course': [item: DegreeItem]
  'remove-course': [item: DegreeItem]
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

const concentrationName = computed(() => props.plan?.specialization?.name?.trim() || '')

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

const sections = computed<(DegreeSection & { copy: SectionCopy | null })[]>(() => {
  const raw = props.plan?.sections
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s) => Array.isArray(s?.items) && s.items && s.items.length > 0)
    .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
    .map((section) => ({ ...section, copy: parseSectionCopy(section.description) }))
})

type MapRow =
  | { kind: 'course'; key: string; item: DegreeItem; counted: number; applied: number }
  | { kind: 'bucket'; key: string; item: DegreeItem; filled: number; required: number | null }
  | { kind: 'elective'; key: string; item: DegreeItem; counted: number; applied: number }
  | { kind: 'add'; key: string; item: DegreeItem }

function finiteLimit(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function bucketRequiredHours(item: DegreeItem): number | null {
  return finiteLimit(item.credits ?? item.course?.credits)
}

function sectionCountedLines(section: DegreeSection) {
  const pieces: { record: ElectiveRecord; applied: number; countedBeforeSection: number }[] = []
  for (const item of section.items || []) {
    if (isElectiveBucket(item)) {
      const records = electiveRecords(item)
      const capped = countTowardLimit(
        records.map((record) => countableHours(record, item)),
        bucketRequiredHours(item),
      )
      records.forEach((record, index) => {
        pieces.push({
          record,
          applied: appliedElectiveHours(record) ?? 0,
          countedBeforeSection: capped[index] ?? 0,
        })
      })
    } else {
      for (const record of trackedRecords(item)) {
        const applied = appliedElectiveHours(record) ?? 0
        pieces.push({ record, applied, countedBeforeSection: countableHours(record, item) })
      }
    }
  }
  const counted = countTowardLimit(
    pieces.map((piece) => piece.countedBeforeSection),
    finiteLimit(section.creditsRequired),
  )
  return pieces.map((piece, index) => ({
    record: piece.record,
    applied: piece.applied,
    counted: counted[index] ?? 0,
  }))
}

function sectionCountedHours(section: DegreeSection) {
  return sectionCountedLines(section).reduce((sum, line) => sum + line.counted, 0)
}

function trackedRecords(item: DegreeItem): ElectiveRecord[] {
  if (item.electiveLine) return item.record ? [item.record] : []
  if (isElectiveBucket(item)) return electiveRecords(item)
  return item.record ? [item.record] : []
}

function sectionRows(section: DegreeSection): MapRow[] {
  const countedByRecord = new Map(sectionCountedLines(section).map((line) => [line.record, line]))
  const rows: MapRow[] = []
  for (const item of section.items || []) {
    if (!isElectiveBucket(item)) {
      const record = trackedRecords(item)[0]
      const line = record ? countedByRecord.get(record) : undefined
      rows.push({
        kind: 'course',
        key: `c-${item.id}`,
        item,
        counted: line?.counted ?? 0,
        applied: line?.applied ?? 0,
      })
      continue
    }
    const records = electiveRecords(item)
    const required = bucketRequiredHours(item)
    const filled = records.reduce((sum, record) => sum + (countedByRecord.get(record)?.counted ?? 0), 0)
    rows.push({
      kind: 'bucket',
      key: `b-${item.id}`,
      item,
      filled,
      required,
    })
    records.forEach((record, index) => {
      const line = countedByRecord.get(record)
      rows.push({
        kind: 'elective',
        key: `e-${item.id}-${record.id ?? index}`,
        item: electiveLineView(item, record) as DegreeItem,
        counted: line?.counted ?? 0,
        applied: line?.applied ?? 0,
      })
    })
    rows.push({ kind: 'add', key: `a-${item.id}`, item })
  }
  return rows
}

function countableHours(record: ElectiveRecord, item: DegreeItem) {
  const status = record.status ?? item.status
  if (!isCompletedRecord({ status })) return 0
  return appliedElectiveHours(record) ?? 0
}

function countedHoursLabel(row: MapRow) {
  if (row.kind !== 'elective' && row.kind !== 'course') return '—'
  const shown = row.counted > 0 ? row.counted : row.applied
  if (shown <= 0) return '—'
  return formatHours(shown)
}

function countedHoursTitle(row: MapRow) {
  if (row.kind !== 'elective' && row.kind !== 'course') return undefined
  if (row.applied > 0 && row.counted === 0) return 'Counts toward totals once marked completed.'
  if (row.applied > row.counted) {
    return `${formatHours(row.applied)} entered. ${formatHours(row.counted)} count toward this section.`
  }
  return undefined
}

function newElectiveLine(item: DegreeItem): DegreeItem {
  return {
    ...item,
    electiveLine: true,
    record: undefined,
    course: undefined,
    code: undefined,
    title: undefined,
    label: item.label,
    description: undefined,
  }
}

function bucketComplete(row: { filled: number; required: number | null }) {
  return row.required != null && row.required > 0 && row.filled >= row.required
}

function bucketHoursLabel(row: { filled: number; required: number | null }) {
  if (row.required == null) return formatHours(row.filled)
  return `${formatHours(row.filled)} of ${formatHours(row.required)}`
}

function recordHoursType(record: ElectiveRecord | null | undefined) {
  return String(record?.hoursType ?? '').trim().toLowerCase()
}

function isResidentialType(raw: string) {
  return raw === 'residential' || raw === 'r'
}

function isNonResidentialType(raw: string) {
  return (
    raw === 'non-residential' ||
    raw === 'nonresidential' ||
    raw === 'non_residential' ||
    raw === 'online' ||
    raw === 'n'
  )
}

const hourTotals = computed(() => {
  let earned = 0
  let residential = 0
  let nonResidential = 0
  for (const section of sections.value) {
    for (const line of sectionCountedLines(section)) {
      earned += line.counted
      const type = recordHoursType(line.record)
      if (isResidentialType(type)) residential += line.counted
      if (isNonResidentialType(type)) nonResidential += line.counted
    }
  }
  return { earned, residential, nonResidential }
})

const totalHoursEarned = computed(() => hourTotals.value.earned)

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

const residentialHoursCompleted = computed(() => hourTotals.value.residential)

const nonResidentialHoursCompleted = computed(() => hourTotals.value.nonResidential)

function courseCode(item: DegreeItem) {
  if (item.electiveLine) return item.code || '—'
  const c = item.course
  return (c && c.code) ?? item.code ?? '—'
}

function courseTitle(item: DegreeItem) {
  if (item.electiveLine) return item.title || item.label || 'Course'
  const c = item.course
  return (c && (c.title ?? c.description)) ?? item.label ?? item.title ?? '—'
}

function courseDescription(item: DegreeItem) {
  const c = item.course
  const rec = item.record as any
  const desc = (c && c.description) ?? rec?.description ?? (item as any).description ?? ''
  const title = courseTitle(item)
  if (desc && title && String(desc).trim() === String(title).trim()) return ''
  return desc
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
  const applied = appliedElectiveHours(item.record)
  if (applied != null) return formatHours(applied)
  const v = item.hoursEarned ?? null
  return v != null && v !== '' ? String(v) : '—'
}

function courseHoursType(item: DegreeItem) {
  const r = item.record
  const raw = (r?.hoursType ?? item.hoursType ?? (item as any).hours_type ?? '') as string
  if (!raw) return '—'
  const v = raw.toLowerCase()
  if (v === 'residential' || v === 'r') return 'R'
  if (v === 'non-residential' || v === 'nonresidential' || v === 'non_residential' || v === 'online' || v === 'n') return 'N'
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
  return isCompletedRecord(item.record) || isCompletedRecord({ status: item.status })
}
</script>

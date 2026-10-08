<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />

    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Form Results</h1>
          <p class="mt-1 text-sm text-gray-600">
            Use this section to review and manage submitted form responses.
          </p>
        </div>

        <div
          v-if="mePending"
          class="py-8 text-gray-500"
        >
          Checking access...
        </div>

        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to this dashboard section.
        </div>

        <div
          v-else
          class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div class="grid gap-4 md:grid-cols-[minmax(220px,320px)_1fr] md:items-end mb-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Form</label>
              <select
                v-model="selectedFormSlug"
                class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
              >
                <option value="">All forms</option>
                <option v-for="opt in formOptions" :key="opt.slug" :value="opt.slug">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="text-sm text-gray-600">
              Showing
              <span class="font-medium text-gray-900">{{ submissionsMeta.totalDocs }}</span>
              submissions
              <span v-if="selectedFormSlug">for <span class="font-medium text-gray-900">{{ selectedFormSlug }}</span></span>.
            </div>
          </div>

          <div v-if="submissionsPending" class="py-8 text-sm text-gray-500">Loading submissions...</div>
          <div v-else-if="submissionsError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
            {{ submissionsError }}
          </div>
          <div v-else-if="!submissionRows.length" class="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
            No submissions found for the selected form.
          </div>
          <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
            <div class="overflow-x-auto rounded-lg border border-gray-200">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left font-medium text-gray-700">Submitted</th>
                    <th class="px-4 py-2 text-left font-medium text-gray-700">Form</th>
                    <th class="px-4 py-2 text-left font-medium text-gray-700">Submitted by</th>
                    <th class="px-4 py-2 text-left font-medium text-gray-700">Answers</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
                  <tr
                    v-for="row in submissionRows"
                    :key="row.id"
                    class="cursor-pointer hover:bg-gray-50"
                    :class="selectedRow?.id === row.id ? 'bg-[rgba(13,94,130,0.06)]' : ''"
                    @click="selectedId = row.id"
                  >
                    <td class="px-4 py-3 text-gray-700">{{ row.createdAtDisplay }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ row.formLabel }}</td>
                    <td class="px-4 py-3 text-gray-700">{{ row.email || '—' }}</td>
                    <td class="px-4 py-3 text-gray-500">{{ row.answerCount }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <aside class="rounded-lg border border-gray-200 bg-gray-50 p-4 lg:sticky lg:top-4">
              <template v-if="selectedRow">
                <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Submission</p>
                <h2 class="mt-1 text-base font-semibold text-gray-900">{{ selectedRow.formLabel }}</h2>
                <p class="mt-1 text-sm text-gray-600">
                  {{ selectedRow.email || 'Unknown submitter' }}
                  · {{ selectedRow.createdAtDisplay }}
                </p>
                <dl v-if="selectedRow.answers.length" class="mt-4 space-y-3">
                  <div
                    v-for="(item, idx) in selectedRow.answers"
                    :key="`${selectedRow.id}-${idx}`"
                    class="rounded-md border border-gray-200 bg-white px-3 py-2"
                  >
                    <dt class="text-xs font-medium text-gray-500">{{ item.label }}</dt>
                    <dd v-if="item.table" class="mt-2 overflow-x-auto">
                      <table class="min-w-full text-sm">
                        <thead>
                          <tr>
                            <th
                              v-for="col in item.table.columns"
                              :key="col"
                              class="border-b border-gray-200 px-2 py-1 text-left text-xs font-medium text-gray-500"
                            >
                              {{ col }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(cells, rowIdx) in item.table.rows" :key="rowIdx">
                            <td
                              v-for="(cell, cellIdx) in cells"
                              :key="cellIdx"
                              class="border-b border-gray-100 px-2 py-1 text-gray-900"
                            >
                              {{ cell }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </dd>
                    <dd v-else class="mt-0.5 whitespace-pre-wrap wrap-break-word text-sm text-gray-900">{{ item.value }}</dd>
                  </div>
                </dl>
                <p v-else class="mt-4 text-sm text-gray-600">This submission has no answers.</p>
              </template>
              <p v-else class="text-sm text-gray-600">Select a submission to read its answers.</p>
            </aside>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { formatStoredAnswer } from '~/utils/forms/productFields'

type FieldMeta = {
  label: string
  options?: { label: string; value: string }[]
  columns?: { id: string; label: string }[]
}

type AnswerItem = {
  label: string
  value: string
  table?: { columns: string[]; rows: string[][] }
}

const { mePending, canAccessSection } = useDashboardAccess()
const canManageDashboard = computed(() => canAccessSection('form-results'))

const selectedFormSlug = ref('')

const {
  data: formsData,
  refresh: refreshForms,
} = await useFetch<any>('/api/dashboard/forms', {
  key: 'dashboard-form-results-forms',
  query: () => ({
    limit: 100,
    sort: '-updatedAt',
  }),
  immediate: false,
  watch: [canManageDashboard],
})

const formOptions = computed(() => {
  const docs = Array.isArray(formsData.value?.docs) ? formsData.value.docs : []
  return docs
    .map((f: any) => {
      const slug = String(f?.slug || '').trim()
      if (!slug) return null
      const title = String(f?.title || '').trim()
      return { slug, label: title ? `${title} (${slug})` : slug }
    })
    .filter((v: any): v is { slug: string; label: string } => !!v)
})

const {
  data: submissionsData,
  pending: submissionsPending,
  error: submissionsErrorRef,
  refresh: refreshSubmissions,
} = await useFetch<any>('/api/dashboard/form-submissions', {
  key: () => `dashboard-form-results-submissions-${selectedFormSlug.value || 'all'}`,
  immediate: false,
  query: () => ({
    limit: 50,
    page: 1,
    ...(selectedFormSlug.value ? { formSlug: selectedFormSlug.value } : {}),
  }),
  watch: [selectedFormSlug, canManageDashboard],
})

watch(canManageDashboard, (allowed) => {
  if (allowed) {
    refreshForms()
    refreshSubmissions()
  }
}, { immediate: true })

const submissionsError = computed(() => {
  const e = submissionsErrorRef.value as any
  return e?.data?.message ?? e?.statusMessage ?? e?.message ?? null
})

const submissionsMeta = computed(() => ({
  totalDocs: Number(submissionsData.value?.totalDocs || 0),
}))

const fieldsBySlug = computed(() => {
  const docs = Array.isArray(formsData.value?.docs) ? formsData.value.docs : []
  const bySlug = new Map<string, Map<string, FieldMeta>>()
  for (const form of docs) {
    const slug = String(form?.slug || '').trim()
    const fields = Array.isArray(form?.schema?.fields) ? form.schema.fields : []
    if (!slug) continue
    const byKey = new Map<string, FieldMeta>()
    for (const field of fields) {
      const key = String(field?.id || field?.key || '').trim()
      if (!key) continue
      byKey.set(key, {
        label: String(field?.label || '').trim() || humanizeKey(key),
        options: Array.isArray(field?.options)
          ? field.options
            .map((opt: any) => ({
              label: String(opt?.label || opt?.value || '').trim(),
              value: String(opt?.value ?? '').trim(),
            }))
            .filter((opt: { label: string; value: string }) => opt.value)
          : undefined,
        columns: Array.isArray(field?.columns)
          ? field.columns
            .map((col: any) => ({
              id: String(col?.id || '').trim(),
              label: String(col?.label || col?.id || '').trim(),
            }))
            .filter((col: { id: string }) => col.id)
          : undefined,
      })
    }
    bySlug.set(slug, byKey)
  }
  return bySlug
})

const selectedId = ref('')

const submissionRows = computed(() => {
  const docs = Array.isArray(submissionsData.value?.docs) ? submissionsData.value.docs : []
  return docs.map((doc: any) => {
    const formSlug = String(doc?.formSlug ?? doc?.form?.slug ?? '').trim()
    const rawAnswers = doc?.answers ?? doc?.data ?? {}
    const answers = formatAnswers(rawAnswers, fieldsBySlug.value.get(formSlug))
    const createdAt = typeof doc?.createdAt === 'string' ? new Date(doc.createdAt) : null
    const formOption = formOptions.value.find((opt) => opt.slug === formSlug)
    return {
      id: String(doc?.id ?? ''),
      formSlug,
      formLabel: formOption?.label || formSlug || '—',
      email: String(doc?.email ?? '').trim(),
      createdAtDisplay: createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleString()
        : '—',
      answers,
      answerCount: answers.length === 1 ? '1 answer' : `${answers.length} answers`,
    }
  })
})

const selectedRow = computed(() =>
  submissionRows.value.find((row) => row.id === selectedId.value) || submissionRows.value[0] || null,
)

watch(submissionRows, (rows) => {
  if (!rows.some((row) => row.id === selectedId.value)) {
    selectedId.value = rows[0]?.id || ''
  }
})

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  if (!spaced) return 'Answer'
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function isEmptyAnswer(value: unknown): boolean {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

function optionLabel(field: FieldMeta | undefined, value: string): string {
  const match = field?.options?.find((opt) => opt.value === value)
  return match?.label || value
}

function formatPlain(value: unknown, field?: FieldMeta): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string' || typeof value === 'number') {
    const text = optionLabel(field, String(value)).trim()
    return text || '—'
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    const fileName = String(obj.filename || obj.originalName || '').trim()
    const url = String(obj.url || obj.href || '').trim()
    if (fileName && url) return `${fileName}\n${url}`
    if (fileName || url) return fileName || url
    const formatted = formatStoredAnswer(value).trim()
    if (formatted && !formatted.startsWith('{') && !formatted.startsWith('[')) return formatted
    const lines = Object.entries(obj)
      .filter(([, entry]) => !isEmptyAnswer(entry))
      .map(([key, entry]) => `${humanizeKey(key)}: ${formatPlain(entry)}`)
    if (lines.length) return lines.join('\n')
  }
  const formatted = formatStoredAnswer(value).trim()
  return formatted || '—'
}

function formatRepeater(value: unknown[], field?: FieldMeta): AnswerItem['table'] | null {
  const objects = value.filter((row) => row && typeof row === 'object' && !Array.isArray(row)) as Record<string, unknown>[]
  if (!objects.length || objects.length !== value.length) return null
  const columns = field?.columns?.length
    ? field.columns
    : Object.keys(objects[0]).map((id) => ({ id, label: humanizeKey(id) }))
  const rows = objects
    .map((row) => columns.map((col) => formatPlain(row[col.id])))
    .filter((cells) => cells.some((cell) => cell !== '—'))
  if (!rows.length) return null
  return {
    columns: columns.map((col) => col.label || humanizeKey(col.id)),
    rows,
  }
}

function formatAnswers(raw: unknown, fields?: Map<string, FieldMeta>): AnswerItem[] {
  const answers = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const orderedKeys = [
    ...(fields ? [...fields.keys()] : []),
    ...Object.keys(answers).filter((key) => !fields?.has(key)),
  ]
  const items: AnswerItem[] = []
  for (const key of orderedKeys) {
    if (!(key in answers) || isEmptyAnswer(answers[key])) continue
    const field = fields?.get(key)
    const value = answers[key]
    const label = field?.label || humanizeKey(key)
    if (Array.isArray(value)) {
      const table = formatRepeater(value, field)
      if (table) {
        items.push({ label, value: '', table })
        continue
      }
      const joined = value
        .map((entry) => formatPlain(entry, field))
        .filter((text) => text && text !== '—')
        .join(', ')
      if (joined) items.push({ label, value: joined })
      continue
    }
    items.push({ label, value: formatPlain(value, field) })
  }
  return items
}
</script>

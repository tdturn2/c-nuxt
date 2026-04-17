<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside
      class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80"
    >
      <LeftInternal />
    </aside>

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
          You do not have access to the dashboard admin panel. Access is limited to staff.
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
          <div v-else class="overflow-x-auto rounded-lg border border-gray-200">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left font-medium text-gray-700">Submitted</th>
                  <th class="px-4 py-2 text-left font-medium text-gray-700">Form</th>
                  <th class="px-4 py-2 text-left font-medium text-gray-700">Submission ID</th>
                  <th class="px-4 py-2 text-left font-medium text-gray-700">Answers</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 bg-white">
                <tr v-for="row in submissionRows" :key="row.id">
                  <td class="px-4 py-2 text-gray-700">{{ row.createdAtDisplay }}</td>
                  <td class="px-4 py-2 text-gray-700">{{ row.formSlug || '—' }}</td>
                  <td class="px-4 py-2 text-gray-700">{{ row.id }}</td>
                  <td class="px-4 py-2 text-gray-700">
                    <pre class="max-w-[48rem] whitespace-pre-wrap break-words text-[11px] leading-snug">{{ row.answersPreview }}</pre>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-form-results-me',
})

const canManageDashboard = computed(() => {
  const user = me.value
  if (!user) return false
  const roles: string[] = Array.isArray(user.roles) ? user.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

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

const submissionRows = computed(() => {
  const docs = Array.isArray(submissionsData.value?.docs) ? submissionsData.value.docs : []
  return docs.map((doc: any) => {
    const rawAnswers = doc?.answers ?? doc?.data ?? {}
    let answersPreview = ''
    try {
      answersPreview = JSON.stringify(rawAnswers, null, 2)
    } catch {
      answersPreview = String(rawAnswers ?? '')
    }
    const createdAt = typeof doc?.createdAt === 'string' ? new Date(doc.createdAt) : null
    return {
      id: String(doc?.id ?? ''),
      formSlug: String(doc?.formSlug ?? '').trim(),
      createdAtDisplay: createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleString()
        : '—',
      answersPreview,
    }
  })
})
</script>

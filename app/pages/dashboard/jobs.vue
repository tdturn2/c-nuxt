<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Jobs Manager</h1>
          <p class="mt-1 text-sm text-gray-600">
            Review, publish, edit, and remove job board listings.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>

        <template v-else>
          <div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex flex-wrap items-center gap-3">
              <span class="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                Jobs: <span class="font-semibold text-gray-900">{{ filteredJobs.length }}</span>
                <span class="text-gray-400"> / {{ jobs.length }}</span>
              </span>
              <UInput
                v-model="searchQuery"
                type="search"
                placeholder="Search title or company..."
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
                size="sm"
                class="w-72"
              />
              <select
                v-model="statusFilter"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
              >
                <option value="">All statuses</option>
                <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <button
              type="button"
              class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
              @click="openCreateModal"
            >
              Add job
            </button>
          </div>

          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {{ error }}
          </div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Title</th>
                  <th class="px-4 py-2 text-left font-semibold">Company</th>
                  <th class="px-4 py-2 text-left font-semibold">Type</th>
                  <th class="px-4 py-2 text-left font-semibold">Status</th>
                  <th class="px-4 py-2 text-left font-semibold">Posted</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">Loading jobs...</td>
                </tr>
                <tr v-else-if="!filteredJobs.length" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">No jobs found.</td>
                </tr>
                <tr
                  v-for="job in filteredJobs"
                  :key="String(job.id)"
                  class="border-t border-gray-200"
                >
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-900">{{ job.jobTitle || 'Untitled' }}</p>
                    <p v-if="job.location" class="text-xs text-gray-500">{{ job.location }}</p>
                  </td>
                  <td class="px-4 py-3 text-gray-700">{{ job.companyName || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ formatJobType(job.jobType) || '—' }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="statusBadgeClass(job.status)"
                    >
                      {{ formatStatus(job.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {{ formatDate(job.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <button
                      v-if="job.status !== 'published'"
                      type="button"
                      class="text-emerald-700 hover:underline"
                      :disabled="saving"
                      @click="setStatus(job, 'published')"
                    >
                      Publish
                    </button>
                    <button
                      v-if="job.status === 'published'"
                      type="button"
                      class="text-amber-700 hover:underline"
                      :disabled="saving"
                      @click="setStatus(job, 'inactive')"
                    >
                      Unpublish
                    </button>
                    <button
                      type="button"
                      class="text-[rgba(13,94,130,1)] hover:underline"
                      @click="startEdit(job)"
                    >
                      Edit
                    </button>
                    <NuxtLink
                      v-if="job.id"
                      :to="`/jobs/${job.id}`"
                      target="_blank"
                      class="text-gray-600 hover:underline"
                    >
                      View
                    </NuxtLink>
                    <button
                      type="button"
                      class="text-red-700 hover:underline"
                      :disabled="saving"
                      @click="removeJob(job)"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <UModal v-model:open="modalOpen" :ui="{ content: 'max-w-3xl' }">
            <template #header>
              <h2 class="text-base font-semibold text-gray-900">
                {{ editingId ? 'Edit job' : 'Add job' }}
              </h2>
            </template>
            <template #body>
              <form class="space-y-4" @submit.prevent="saveJob">
                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-gray-700">
                      Job title <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="form.jobTitle"
                      type="text"
                      required
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">
                      Company name <span class="text-red-500">*</span>
                    </label>
                    <input
                      v-model="form.companyName"
                      type="text"
                      required
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Status</label>
                    <select
                      v-model="form.status"
                      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                      <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Location</label>
                    <input
                      v-model="form.location"
                      type="text"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                  </div>
                  <div class="flex items-end pb-2">
                    <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input v-model="form.remotePosition" type="checkbox" class="h-4 w-4 rounded border-gray-300">
                      Remote position
                    </label>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Job type</label>
                    <select
                      v-model="form.jobType"
                      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                      <option value="">Select</option>
                      <option v-for="opt in JOB_TYPES" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Category</label>
                    <select
                      v-model="form.jobCategory"
                      class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                      <option value="">Select</option>
                      <option v-for="opt in JOB_CATEGORIES" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                  <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-gray-700">
                      Description <span class="text-red-500">*</span>
                    </label>
                    <textarea
                      v-model="form.description"
                      required
                      rows="8"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="mb-1 block text-sm font-medium text-gray-700">
                      Application email or URL
                    </label>
                    <input
                      v-model="form.applicationEmailOrUrl"
                      type="text"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Company website</label>
                    <input
                      v-model="form.companyWebsite"
                      type="text"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Company tagline</label>
                    <input
                      v-model="form.companyTagline"
                      type="text"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Company video URL</label>
                    <input
                      v-model="form.companyVideoUrl"
                      type="text"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                  </div>
                  <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">
                      Company Twitter username
                    </label>
                    <input
                      v-model="form.companyTwitterUsername"
                      type="text"
                      class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                    >
                  </div>
                </div>

                <div v-if="formError" class="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
                  {{ formError }}
                </div>

                <div class="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    @click="closeModal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                    :disabled="saving"
                  >
                    {{ saving ? 'Saving…' : editingId ? 'Update job' : 'Create job' }}
                  </button>
                </div>
              </form>
            </template>
          </UModal>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type JobStatus = 'pending' | 'published' | 'inactive'

type Job = {
  id?: number | string
  status?: JobStatus | string
  jobTitle?: string
  location?: string | null
  remotePosition?: boolean
  jobType?: string | null
  jobCategory?: string | null
  description?: string
  applicationEmailOrUrl?: string | null
  companyName?: string
  companyWebsite?: string | null
  companyTagline?: string | null
  companyVideoUrl?: string | null
  companyTwitterUsername?: string | null
  createdAt?: string
  updatedAt?: string
}

type JobForm = {
  status: JobStatus
  jobTitle: string
  location: string
  remotePosition: boolean
  jobType: string
  jobCategory: string
  description: string
  applicationEmailOrUrl: string
  companyName: string
  companyWebsite: string
  companyTagline: string
  companyVideoUrl: string
  companyTwitterUsername: string
}

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Published', value: 'published' },
  { label: 'Inactive', value: 'inactive' },
] as const

const JOB_TYPES = [
  { label: 'Freelance', value: 'freelance' },
  { label: 'Full Time', value: 'full_time' },
  { label: 'Internship', value: 'internship' },
  { label: 'Part Time', value: 'part_time' },
  { label: 'Temporary', value: 'temporary' },
  { label: 'Volunteer', value: 'volunteer' },
] as const

const JOB_CATEGORIES = [
  { label: 'Administration', value: 'administration' },
  { label: 'Chaplain', value: 'chaplain' },
  { label: 'Christian Education', value: 'christian_education' },
  { label: 'Counseling', value: 'counseling' },
  { label: 'Finance', value: 'finance' },
  { label: 'General Labor', value: 'general_labor' },
  { label: 'Marketplace', value: 'marketplace' },
  { label: 'Missions', value: 'missions' },
  { label: 'Music', value: 'music' },
  { label: 'Pastoral Ministry', value: 'pastoral_ministry' },
  { label: 'Associate Pastor', value: 'associate_pastor' },
  { label: "Children's Ministry", value: 'children_ministry' },
  { label: 'Interim Pastor', value: 'interim_pastor' },
  { label: 'Senior Pastor', value: 'senior_pastor' },
  { label: 'Worship Pastor', value: 'worship_pastor' },
  { label: 'Youth Pastor', value: 'youth_pastor' },
  { label: 'Student Ministry', value: 'student_ministry' },
  { label: 'Teaching', value: 'teaching' },
] as const

const emptyForm = (): JobForm => ({
  status: 'pending',
  jobTitle: '',
  location: '',
  remotePosition: false,
  jobType: '',
  jobCategory: '',
  description: '',
  applicationEmailOrUrl: '',
  companyName: '',
  companyWebsite: '',
  companyTagline: '',
  companyVideoUrl: '',
  companyTwitterUsername: '',
})

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-jobs-me',
})

const canManageDashboard = computed(() => {
  const roles: string[] = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const jobs = ref<Job[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const searchQuery = ref('')
const statusFilter = ref('')
const modalOpen = ref(false)
const editingId = ref<string | number | null>(null)
const form = ref<JobForm>(emptyForm())

const filteredJobs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const status = statusFilter.value
  return jobs.value.filter((job) => {
    if (status && String(job.status || '') !== status) return false
    if (!q) return true
    const haystack = `${job.jobTitle || ''} ${job.companyName || ''} ${job.location || ''}`.toLowerCase()
    return haystack.includes(q)
  })
})

function formatStatus(status?: string) {
  if (!status) return '—'
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

function formatJobType(value?: string | null) {
  if (!value) return ''
  return JOB_TYPES.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ')
}

function statusBadgeClass(status?: string) {
  if (status === 'published') return 'bg-emerald-50 text-emerald-800'
  if (status === 'pending') return 'bg-amber-50 text-amber-800'
  if (status === 'inactive') return 'bg-gray-100 text-gray-700'
  return 'bg-gray-100 text-gray-700'
}

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function toPayload(formValue: JobForm) {
  return {
    status: formValue.status,
    jobTitle: formValue.jobTitle.trim(),
    companyName: formValue.companyName.trim(),
    description: formValue.description.trim(),
    location: formValue.location.trim() || null,
    remotePosition: Boolean(formValue.remotePosition),
    jobType: formValue.jobType || null,
    jobCategory: formValue.jobCategory || null,
    applicationEmailOrUrl: formValue.applicationEmailOrUrl.trim() || null,
    companyWebsite: formValue.companyWebsite.trim() || null,
    companyTagline: formValue.companyTagline.trim() || null,
    companyVideoUrl: formValue.companyVideoUrl.trim() || null,
    companyTwitterUsername: formValue.companyTwitterUsername.trim() || null,
  }
}

async function loadJobs() {
  if (!canManageDashboard.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ docs?: Job[] }>('/api/dashboard/jobs')
    jobs.value = Array.isArray(res?.docs) ? res.docs : []
  } catch (err: any) {
    error.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to load jobs.'
    jobs.value = []
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
  modalOpen.value = true
}

function startEdit(job: Job) {
  editingId.value = job.id ?? null
  form.value = {
    status: (['pending', 'published', 'inactive'].includes(String(job.status))
      ? String(job.status)
      : 'pending') as JobStatus,
    jobTitle: job.jobTitle || '',
    location: job.location || '',
    remotePosition: Boolean(job.remotePosition),
    jobType: job.jobType || '',
    jobCategory: job.jobCategory || '',
    description: job.description || '',
    applicationEmailOrUrl: job.applicationEmailOrUrl || '',
    companyName: job.companyName || '',
    companyWebsite: job.companyWebsite || '',
    companyTagline: job.companyTagline || '',
    companyVideoUrl: job.companyVideoUrl || '',
    companyTwitterUsername: job.companyTwitterUsername || '',
  }
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editingId.value = null
  form.value = emptyForm()
  formError.value = ''
}

async function saveJob() {
  formError.value = ''
  const payload = toPayload(form.value)
  if (!payload.jobTitle || !payload.companyName || !payload.description) {
    formError.value = 'Job title, company name, and description are required.'
    return
  }

  saving.value = true
  try {
    if (editingId.value != null) {
      await $fetch(`/api/dashboard/jobs/${encodeURIComponent(String(editingId.value))}`, {
        method: 'PATCH',
        body: payload,
      })
    } else {
      await $fetch('/api/dashboard/jobs', {
        method: 'POST',
        body: payload,
      })
    }
    closeModal()
    await loadJobs()
  } catch (err: any) {
    formError.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to save job.'
  } finally {
    saving.value = false
  }
}

async function setStatus(job: Job, status: JobStatus) {
  if (job.id == null) return
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/dashboard/jobs/${encodeURIComponent(String(job.id))}`, {
      method: 'PATCH',
      body: { status },
    })
    await loadJobs()
  } catch (err: any) {
    error.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to update status.'
  } finally {
    saving.value = false
  }
}

async function removeJob(job: Job) {
  if (job.id == null) return
  const title = job.jobTitle || 'this job'
  if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return

  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/dashboard/jobs/${encodeURIComponent(String(job.id))}`, {
      method: 'DELETE',
    })
    await loadJobs()
  } catch (err: any) {
    error.value = err?.data?.message ?? err?.statusMessage ?? err?.message ?? 'Failed to delete job.'
  } finally {
    saving.value = false
  }
}

watch(canManageDashboard, (allowed) => {
  if (allowed) loadJobs()
}, { immediate: true })
</script>

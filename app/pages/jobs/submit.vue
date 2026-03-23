<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">Submit a Job</h1>

        <form class="space-y-6" @submit.prevent="onSubmit">
          <div v-if="submitError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
            {{ submitError }}
          </div>
          <div v-if="submitSuccess" class="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
            Your job has been submitted and is pending review.
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <h2 class="text-lg font-semibold text-gray-900">Job details</h2>
            <div>
              <label for="jobTitle" class="block text-sm font-medium text-gray-700 mb-1">Job title <span class="text-red-500">*</span></label>
              <input
                id="jobTitle"
                v-model="form.jobTitle"
                type="text"
                required
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="e.g. Director of Admissions"
              />
            </div>
            <div>
              <label for="location" class="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                id="location"
                v-model="form.location"
                type="text"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="e.g. Wilmore, KY"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                id="remotePosition"
                v-model="form.remotePosition"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-[rgba(13,94,130,1)] focus:ring-[rgba(13,94,130,1)]"
              />
              <label for="remotePosition" class="text-sm text-gray-700">Remote position</label>
            </div>
            <div>
              <label for="jobType" class="block text-sm font-medium text-gray-700 mb-1">Job type</label>
              <select
                id="jobType"
                v-model="form.jobType"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
              >
                <option value="">Select</option>
                <option value="freelance">Freelance</option>
                <option value="full_time">Full-time</option>
                <option value="internship">Internship</option>
                <option value="part_time">Part-time</option>
                <option value="temporary">Temporary</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </div>
            <div>
              <label for="jobCategory" class="block text-sm font-medium text-gray-700 mb-1">Job category</label>
              <select
                id="jobCategory"
                v-model="form.jobCategory"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
              >
                <option value="">Select</option>
                <option v-for="opt in jobCategoryOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description <span class="text-red-500">*</span></label>
              <textarea
                id="description"
                v-model="form.description"
                required
                rows="6"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="Describe the role and requirements…"
              />
            </div>
            <div>
              <label for="applicationEmailOrUrl" class="block text-sm font-medium text-gray-700 mb-1">Application email or URL</label>
              <input
                id="applicationEmailOrUrl"
                v-model="form.applicationEmailOrUrl"
                type="text"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="email@example.com or https://…"
              />
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
            <h2 class="text-lg font-semibold text-gray-900">Company</h2>
            <div>
              <label for="companyName" class="block text-sm font-medium text-gray-700 mb-1">Company name <span class="text-red-500">*</span></label>
              <input
                id="companyName"
                v-model="form.companyName"
                type="text"
                required
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="Organization or company name"
              />
            </div>
            <div>
              <label for="companyWebsite" class="block text-sm font-medium text-gray-700 mb-1">Company website</label>
              <input
                id="companyWebsite"
                v-model="form.companyWebsite"
                type="url"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="https://…"
              />
            </div>
            <div>
              <label for="companyTagline" class="block text-sm font-medium text-gray-700 mb-1">Company tagline</label>
              <input
                id="companyTagline"
                v-model="form.companyTagline"
                type="text"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="Short tagline"
              />
            </div>
            <div>
              <label for="companyVideoUrl" class="block text-sm font-medium text-gray-700 mb-1">Company video URL</label>
              <input
                id="companyVideoUrl"
                v-model="form.companyVideoUrl"
                type="url"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="https://…"
              />
            </div>
            <div>
              <label for="companyTwitterUsername" class="block text-sm font-medium text-gray-700 mb-1">Company Twitter username</label>
              <input
                id="companyTwitterUsername"
                v-model="form.companyTwitterUsername"
                type="text"
                class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                placeholder="e.g. asburyseminary"
              />
            </div>
          </div>

          <div class="flex gap-3">
            <button
              type="submit"
              class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="submitting"
            >
              {{ submitting ? 'Submitting…' : 'Submit job' }}
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const form = ref({
  jobTitle: '',
  location: '',
  remotePosition: false,
  jobType: '' as string,
  jobCategory: '' as string,
  description: '',
  applicationEmailOrUrl: '',
  companyName: '',
  companyWebsite: '',
  companyTagline: '',
  companyVideoUrl: '',
  companyTwitterUsername: '',
})

const jobCategoryOptions = [
  { value: 'administration', label: 'Administration' },
  { value: 'advancement', label: 'Advancement' },
  { value: 'alumni_relations', label: 'Alumni Relations' },
  { value: 'communications', label: 'Communications' },
  { value: 'development', label: 'Development' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'faculty', label: 'Faculty' },
  { value: 'finance', label: 'Finance' },
  { value: 'human_resources', label: 'Human Resources' },
  { value: 'information_technology', label: 'Information Technology' },
  { value: 'library', label: 'Library' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ministry', label: 'Ministry' },
  { value: 'operations', label: 'Operations' },
  { value: 'programs', label: 'Programs' },
  { value: 'research', label: 'Research' },
  { value: 'student_services', label: 'Student Services' },
  { value: 'teaching', label: 'Teaching' },
]

const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)

async function onSubmit() {
  submitError.value = null
  submitSuccess.value = false
  submitting.value = true
  try {
    const body: Record<string, unknown> = {
      jobTitle: form.value.jobTitle.trim(),
      companyName: form.value.companyName.trim(),
      description: form.value.description.trim(),
      remotePosition: form.value.remotePosition,
    }
    if (form.value.location?.trim()) body.location = form.value.location.trim()
    if (form.value.jobType) body.jobType = form.value.jobType
    if (form.value.jobCategory) body.jobCategory = form.value.jobCategory
    if (form.value.applicationEmailOrUrl?.trim()) body.applicationEmailOrUrl = form.value.applicationEmailOrUrl.trim()
    if (form.value.companyWebsite?.trim()) body.companyWebsite = form.value.companyWebsite.trim()
    if (form.value.companyTagline?.trim()) body.companyTagline = form.value.companyTagline.trim()
    if (form.value.companyVideoUrl?.trim()) body.companyVideoUrl = form.value.companyVideoUrl.trim()
    if (form.value.companyTwitterUsername?.trim()) body.companyTwitterUsername = form.value.companyTwitterUsername.trim()

    await $fetch('/api/connect-jobs/submit', {
      method: 'POST',
      body,
    })
    submitSuccess.value = true
    form.value = {
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
    }
  } catch (err: any) {
    submitError.value = err?.data?.message ?? err?.message ?? 'Failed to submit job. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-6 text-sm text-gray-500">
      Loading student profile...
    </div>

    <div v-else-if="authError" class="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
      <div class="text-amber-800 text-sm">{{ authError }}</div>
      <p class="text-amber-700 text-sm mt-1">Sign in to view and update your student profile.</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div class="text-red-800 text-sm">{{ error }}</div>
    </div>

    <form v-else class="space-y-6" @submit.prevent="handleSubmit">
      <div class="rounded-md border border-gray-200 bg-gray-50 p-4">
        <p class="text-sm font-medium text-gray-900">
          {{ studentOptIn ? 'Shared with Connect users' : 'Your student profile is private' }}
        </p>
        <p class="mt-2 text-sm text-gray-600">
          Asbury Seminary treats student information as an education record under FERPA. Checking this box is optional.
          It lets other signed-in Connect users see your photo, name, and the student profile details you enter here
          (directory listing and your Connect profile). You can uncheck this box at any time to stop sharing. Your
          answers are still saved for you.
        </p>
        <div class="mt-3 flex items-start gap-2">
          <input
            id="studentOptIn"
            v-model="studentOptIn"
            type="checkbox"
            class="mt-0.5 rounded border-gray-300"
          >
          <label for="studentOptIn" class="text-sm text-gray-800">
            I agree to share my student profile on Connect
          </label>
        </div>
      </div>

      <div
        v-for="q in questions"
        :key="q.id"
        class="flex flex-col"
      >
        <label :for="`q-${q.slug}`" class="block text-sm font-medium text-gray-700 mb-2">
          {{ q.label }}
        </label>

        <select
          v-if="q.type === 'select'"
          :id="`q-${q.slug}`"
          v-model="answers[q.slug]"
          class="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select...</option>
          <option
            v-for="opt in (q.options || [])"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>

        <UInput
          v-else-if="q.type === 'date'"
          :id="`q-${q.slug}`"
          v-model="answers[q.slug]"
          type="date"
          class="w-full"
        />

        <textarea
          v-else-if="q.type === 'textarea'"
          :id="`q-${q.slug}`"
          v-model="answers[q.slug]"
          rows="3"
          class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <input
          v-else
          :id="`q-${q.slug}`"
          v-model="answers[q.slug]"
          type="text"
          class="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div v-if="questions.length === 0" class="text-gray-500 py-4 text-sm">
        No survey questions are available right now.
      </div>

      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          :disabled="saving || !hasChanges"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ saving ? 'Saving...' : 'Save Student Profile' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
interface SurveyQuestion {
  id: number
  slug: string
  label: string
  type: string
  options?: Array<{ label: string; value: string }>
}

const { user: meUser, refresh } = useMe()

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const authError = ref<string | null>(null)

const questions = ref<SurveyQuestion[]>([])
const answers = ref<Record<string, string>>({})
const initialAnswers = ref<Record<string, string>>({})
const studentOptIn = ref(false)
const initialStudentOptIn = ref(false)

const answersChanged = computed(() => {
  const keys = new Set([...Object.keys(answers.value), ...Object.keys(initialAnswers.value)])
  for (const k of keys) {
    const a = String(answers.value[k] ?? '')
    const b = String(initialAnswers.value[k] ?? '')
    if (a !== b) return true
  }
  return false
})

const hasChanges = computed(() => answersChanged.value || studentOptIn.value !== initialStudentOptIn.value)

watch(meUser, (user) => {
  if (!user) return
  studentOptIn.value = Boolean(user.studentOptIn)
  initialStudentOptIn.value = Boolean(user.studentOptIn)
}, { immediate: true })

const loadQuestions = async () => {
  try {
    const res = await $fetch<{ docs: SurveyQuestion[] }>('/api/user-survey-responses/questions')
    questions.value = res?.docs ?? []
    const next: Record<string, string> = {}
    for (const q of questions.value) {
      next[q.slug] = answers.value[q.slug] ?? ''
    }
    answers.value = next
  } catch (e: any) {
    console.error('Error loading survey questions:', e)
    error.value = e.data?.message || 'Failed to load questions'
  }
}

const loadMyResponses = async () => {
  try {
    const res = await $fetch<{ id: number; answers: Record<string, unknown>; updatedAt: string }>('/api/user-survey-responses/me', {
      credentials: 'include',
    })
    const raw = res?.answers ?? {}
    const normalized: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      normalized[k] = v != null ? String(v) : ''
    }
    initialAnswers.value = normalized
    answers.value = { ...normalized }
    for (const q of questions.value) {
      if (!(q.slug in answers.value)) {
        answers.value[q.slug] = ''
      }
    }
  } catch (e: any) {
    if (e.statusCode === 401) {
      authError.value = e.data?.message || 'You must be signed in to view your student profile.'
      if (e.data?.ssoHint) {
        authError.value += ' Sign in with your organization account.'
      }
      return
    }
    console.error('Error loading my responses:', e)
    error.value = e.data?.message || 'Failed to load your responses'
  }
}

const handleSubmit = async () => {
  if (saving.value || !hasChanges.value) return
  try {
    saving.value = true
    error.value = null

    if (studentOptIn.value !== initialStudentOptIn.value) {
      const updated = await $fetch<{ studentOptIn?: boolean }>('/api/employees/profile', {
        method: 'PATCH',
        body: { studentOptIn: studentOptIn.value },
      })
      studentOptIn.value = Boolean(updated?.studentOptIn)
      initialStudentOptIn.value = studentOptIn.value
      refresh()
    }

    if (answersChanged.value) {
      const payload: Record<string, string> = {}
      const keys = new Set([...Object.keys(answers.value), ...Object.keys(initialAnswers.value)])
      for (const k of keys) {
        const current = String(answers.value[k] ?? '').trim()
        const initial = String(initialAnswers.value[k] ?? '').trim()
        if (current !== initial) {
          payload[k] = current
        }
      }
      if (Object.keys(payload).length) {
        const res = await $fetch<{ id: number; answers: Record<string, unknown>; updatedAt: string }>('/api/user-survey-responses/submit', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: { answers: payload },
        })
        const raw = res?.answers ?? {}
        const normalized: Record<string, string> = {}
        for (const [k, v] of Object.entries(raw)) {
          normalized[k] = v != null ? String(v) : ''
        }
        initialAnswers.value = normalized
        answers.value = { ...normalized }
      } else {
        initialAnswers.value = { ...answers.value }
      }
    }
  } catch (e: any) {
    if (e.statusCode === 401) {
      authError.value = e.data?.message || 'You must be signed in to save your student profile.'
      if (e.data?.ssoHint) {
        authError.value += ' Sign in with your organization account.'
      }
      return
    }
    console.error('Error submitting survey:', e)
    error.value = e.data?.error || e.data?.message || 'Failed to save'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!import.meta.client) return
  try {
    loading.value = true
    error.value = null
    authError.value = null
    await loadQuestions()
    await loadMyResponses()
  } finally {
    loading.value = false
  }
})
</script>

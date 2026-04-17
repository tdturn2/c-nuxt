<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="status === 'unauthenticated'" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Please sign in to access this form.
        </div>

        <div v-else-if="pending" class="py-12 text-center text-gray-500">Loading…</div>
        <div v-else-if="loadError" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          {{ loadError }}
        </div>

        <div v-else-if="!formDoc" class="py-12 text-center text-gray-500">Form not found.</div>

        <section v-else>
          <header class="mb-6">
            <h1 class="text-2xl font-bold text-gray-900">{{ formDoc.title || formDoc.slug || 'Form' }}</h1>
            <p class="text-sm text-gray-600 mt-1">
              {{ formDoc.slug }}
            </p>
          </header>

          <div v-if="success" class="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
            Submitted.
            <span v-if="submissionId" class="text-sm text-green-900/80">Submission #{{ submissionId }}</span>
          </div>

          <ConnectFormRenderer
            v-else
            :fields="fields"
            v-model="answers"
            :submitting="submitting"
            :error="submitError"
            :validation-errors="submitValidationErrors"
            :upload-progress="uploadProgress"
            @submit="handleSubmit"
          />

          <div
            v-if="!success && !pending && formDoc && fields.length === 0"
            class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm space-y-2"
          >
            <div class="font-semibold">No fields detected.</div>
            <div>componentKey: <code class="text-xs">{{ String(formDoc.componentKey || '') }}</code></div>
            <div>schema paths checked: <code class="text-xs">schema.raw.fields</code>, <code class="text-xs">schema.fields</code></div>
            <div v-if="schemaErrors.length" class="text-xs text-amber-900">
              {{ schemaErrors.join(' | ') }}
            </div>
            <details>
              <summary class="cursor-pointer text-xs font-semibold">Debug: formDoc</summary>
              <pre class="mt-2 text-[11px] leading-snug overflow-auto max-h-80 whitespace-pre-wrap">{{ JSON.stringify(formDoc, null, 2) }}</pre>
            </details>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import ConnectFormRenderer from '~/components/forms/ConnectFormRenderer.vue'
import type { FormSchemaV1 } from '~/types/forms'
import { normalizeApiError } from '~/utils/forms/apiError'
import { validateAnswersAgainstSchema, validateFormSchemaV1 } from '~/utils/forms/validation'

type PayloadFindResponse<T> = { docs?: T[] }
type ConnectFormDoc = {
  id: number | string
  slug?: string
  title?: string
  componentKey?: string
  editableMode?: 'immutable' | 'versioned' | string
  viewerGroups?: unknown
  schema?: any
}

type Field = {
  key: string
  label?: string
  description?: string
  type: string
  required?: boolean
  choices?: Array<{ label: string; value: string }>
}

const route = useRoute()
const { status } = useAuth()

const slug = computed(() => String(route.params.slug || '').trim())

const { data, pending, error } = await useFetch<{ doc: ConnectFormDoc | null }>(() => `/api/forms/${encodeURIComponent(slug.value)}`, {
  key: () => `forms-${slug.value}`,
  watch: [slug],
})

const formDoc = computed(() => data.value?.doc ?? null)
const schemaErrors = ref<string[]>([])
const submitValidationErrors = ref<string[]>([])
const uploadProgress = ref<Record<string, number>>({})
const rootSubmissionId = computed(() => {
  const raw = route.query.rootSubmissionId
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(id) && id > 0 ? id : undefined
})

const loadError = computed(() => {
  const e = error.value as any
  return e?.data?.message ?? e?.statusMessage ?? e?.message ?? null
})

function getFormSchema(doc: ConnectFormDoc): FormSchemaV1 | null {
  const schema = doc?.schema
  if (!schema) return null

  const direct = validateFormSchemaV1(schema)
  if (direct.valid && direct.schema) return direct.schema

  const legacyCandidates = [schema?.raw, schema?.raw?.raw, schema?.raw?.schema, schema?.['0'], schema?.form]
  for (const candidate of legacyCandidates) {
    const checked = validateFormSchemaV1(candidate)
    if (checked.valid && checked.schema) return checked.schema
  }

  if (typeof schema?.raw === 'string') {
    try {
      const parsed = JSON.parse(schema.raw)
      const checked = validateFormSchemaV1(parsed)
      if (checked.valid && checked.schema) return checked.schema
    } catch {}
  }

  schemaErrors.value = direct.errors
  return null
}

function toField(f: any): Field | null {
  const id = f?.id ?? f?.key ?? f?.name
  const key = id == null ? '' : String(id).trim()
  if (!key) return null

  const typeRaw = String(f?.type ?? f?.inputType ?? 'text').toLowerCase()
  const label = typeof f?.label === 'string' ? f.label : (typeof f?.adminLabel === 'string' ? f.adminLabel : undefined)
  const description = typeof f?.description === 'string' ? f.description : undefined
  const required = !!f?.isRequired || !!f?.required

  const choicesArr = Array.isArray(f?.choices) ? f.choices : []
  const choices = choicesArr
    .map((c: any) => ({
      label: String(c?.text ?? c?.label ?? c?.value ?? '').trim(),
      value: String(c?.value ?? c?.text ?? '').trim(),
    }))
    .filter((c: any) => c.label && c.value)

  let type = typeRaw
  if (type === 'email') type = 'email'
  else if (type === 'number') type = 'number'
  else if (type === 'textarea') type = 'textarea'
  else if (type === 'select') type = 'select'
  else if (type === 'radio') type = 'radio'
  else if (type === 'checkbox') type = 'checkbox'
  else if (type === 'file' || type === 'upload') type = 'file'
  else type = 'text'

  return { key, label, description, type, required, choices: choices.length ? choices : undefined }
}

const fields = computed<Field[]>(() => {
  const doc = formDoc.value
  if (!doc) return []
  const schema = getFormSchema(doc)
  if (!schema) return []
  return (schema.fields || [])
    .map((f: any) =>
      toField({
        id: f.id,
        label: f.label,
        description: f.description,
        type: f.type,
        required: f.required,
        choices: f.options,
      })
    )
    .filter((x): x is Field => x != null)
})

const answers = ref<Record<string, unknown>>({})
const submitting = ref(false)
const submitError = ref<string | null>(null)
const success = ref(false)
const submissionId = ref<number | string | null>(null)

async function handleSubmit(payload: { answers: Record<string, unknown>; files: Record<string, File | null> }) {
  if (!formDoc.value) return
  submitError.value = null
  submitValidationErrors.value = []
  const schema = getFormSchema(formDoc.value)
  if (!schema) {
    submitError.value = 'This form schema is invalid.'
    return
  }
  const checkedAnswers = validateAnswersAgainstSchema(schema, payload.answers)
  if (!checkedAnswers.valid) {
    submitValidationErrors.value = checkedAnswers.errors
    return
  }
  submitting.value = true
  try {
    const submitted: any = await $fetch('/api/form-submissions/submit', {
      method: 'POST',
      body: {
        formSlug: formDoc.value.slug,
        answers: payload.answers,
        rootSubmissionId: formDoc.value.editableMode === 'versioned' ? rootSubmissionId.value : undefined,
      },
    })

    const id = submitted?.submissionId ?? submitted?.doc?.id ?? submitted?.id ?? null
    submissionId.value = id

    // Upload files after submit
    const fileEntries = Object.entries(payload.files || {}).filter(([, f]) => !!f) as Array<[string, File]>
    for (const [fieldKey, file] of fileEntries) {
      if (!id) break
      uploadProgress.value[fieldKey] = 10
      const fd = new FormData()
      fd.set('formSlug', String(formDoc.value.slug || ''))
      fd.set('submissionId', String(id))
      fd.set('fieldKey', String(fieldKey))
      fd.set('file', file)
      await $fetch('/api/form-uploads/upload', { method: 'POST', body: fd })
      uploadProgress.value[fieldKey] = 100
    }

    success.value = true
  } catch (e: any) {
    submitError.value = normalizeApiError(e, 'Failed to submit.').message
  } finally {
    submitting.value = false
  }
}
</script>


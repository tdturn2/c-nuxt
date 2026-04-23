<template>
  <section class="not-prose mt-10 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div v-if="pending" class="py-6 text-sm text-gray-500">Loading form…</div>
    <div v-else-if="loadError" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {{ loadError }}
    </div>
    <div v-else-if="!formDoc" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      This form is not available.
    </div>
    <template v-else>
      <h2 class="text-xl font-semibold text-gray-900">{{ formDoc.title || formDoc.slug || 'Form' }}</h2>
      <p v-if="success" class="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
        Submitted successfully.
      </p>
      <ConnectFormRenderer
        v-else
        class="mt-4"
        :fields="fields"
        :rules="schema?.rules || []"
        v-model="answers"
        :submitting="submitting"
        :error="submitError"
        :validation-errors="validationErrors"
        :upload-progress="uploadProgress"
        @submit="submit"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import ConnectFormRenderer from '~/components/forms/ConnectFormRenderer.vue'
import { normalizeApiError } from '~/utils/forms/apiError'
import { validateAnswersAgainstSchema, validateFormSchemaV1 } from '~/utils/forms/validation'

const props = defineProps<{
  slug: string
}>()

const safeSlug = computed(() => String(props.slug || '').trim())
const { data, pending, error } = await useFetch<{ doc: any | null }>(
  () => `/api/forms/${encodeURIComponent(safeSlug.value)}`,
  { key: () => `inline-form-${safeSlug.value}`, watch: [safeSlug] }
)

const formDoc = computed(() => data.value?.doc ?? null)
const loadError = computed(() => {
  const e = error.value as any
  return e?.data?.message ?? e?.statusMessage ?? e?.message ?? null
})

const schema = computed(() => {
  const checked = validateFormSchemaV1(formDoc.value?.schema)
  return checked.valid ? checked.schema : null
})

function normalizeRendererFieldType(raw: unknown): string {
  const t = String(raw ?? '').trim().toLowerCase()
  if (!t) return 'text'
  if (t === 'text' || t === 'shorttext' || t === 'short_text' || t === 'textfield' || t === 'textinput') return 'text'
  if (t === 'textarea' || t === 'longtext' || t === 'long_text' || t === 'paragraph') return 'textarea'
  if (t === 'email' || t === 'e-mail') return 'email'
  if (t === 'number' || t === 'numeric' || t === 'integer' || t === 'decimal') return 'number'
  if (t === 'date' || t === 'datetime' || t === 'date_time') return 'date'
  if (t === 'time' || t === 'datetime-local' || t === 'datetime_local') return 'time'
  if (t === 'section') return 'section'
  if (t === 'select' || t === 'dropdown') return 'select'
  if (t === 'radio' || t === 'radio-group' || t === 'radiogroup') return 'radio'
  if (t === 'checkbox' || t === 'multi_select' || t === 'multiselect') return 'checkbox'
  if (t === 'file' || t === 'upload') return 'file'
  return t
}

function normalizeTimeString(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const full = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (full) return `${full[1]} ${full[2]}:${full[3]}:${full[4] || '00'}`
  const hm = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (hm) {
    const today = new Date().toISOString().slice(0, 10)
    return `${today} ${hm[1]}:${hm[2]}:${hm[3] || '00'}`
  }
  return raw
}

function normalizeAnswersForSubmit(rawAnswers: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...rawAnswers }
  const s = schema.value
  if (!s) return out
  for (const field of s.fields) {
    if (field.type !== 'time') continue
    out[field.id] = normalizeTimeString(out[field.id])
  }
  return out
}

const fields = computed(() => {
  const s = schema.value
  if (!s) return []
  return s.fields.map((f: any) => ({
    key: f.id,
    label: f.label,
    description: f.description,
    type: normalizeRendererFieldType(f.type),
    required: !!f.required,
    choices: Array.isArray(f.options) ? f.options : undefined,
  }))
})

const answers = ref<Record<string, unknown>>({})
const submitting = ref(false)
const submitError = ref<string | null>(null)
const validationErrors = ref<string[]>([])
const uploadProgress = ref<Record<string, number>>({})
const success = ref(false)

function validateVisibleAnswers(
  schemaValue: NonNullable<typeof schema.value>,
  answersValue: Record<string, unknown>,
  visibleFieldKeys: string[],
) {
  const visibleSet = new Set(visibleFieldKeys)
  const filteredSchema = {
    ...schemaValue,
    fields: schemaValue.fields.filter((field: any) => visibleSet.has(String(field.id || ''))),
  }
  return validateAnswersAgainstSchema(filteredSchema as any, answersValue)
}

async function submit(payload: { answers: Record<string, unknown>; files: Record<string, File | null>; visibleFieldKeys: string[] }) {
  if (!formDoc.value || !schema.value) return
  submitError.value = null
  validationErrors.value = []
  const validated = validateVisibleAnswers(schema.value, payload.answers, payload.visibleFieldKeys || [])
  if (!validated.valid) {
    validationErrors.value = validated.errors
    return
  }

  submitting.value = true
  try {
    const normalizedAnswers = normalizeAnswersForSubmit(payload.answers)
    const submitted: any = await $fetch('/api/form-submissions/submit', {
      method: 'POST',
      body: {
        formSlug: formDoc.value.slug,
        answers: normalizedAnswers,
      },
    })
    const id = submitted?.submissionId ?? submitted?.doc?.id ?? submitted?.id ?? null
    const files = Object.entries(payload.files || {}).filter(([, f]) => !!f) as Array<[string, File]>
    for (const [fieldKey, file] of files) {
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
    submitError.value = normalizeApiError(e, 'Failed to submit form.').message
  } finally {
    submitting.value = false
  }
}
</script>

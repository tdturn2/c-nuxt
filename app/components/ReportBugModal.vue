<template>
  <UModal
    v-model:open="open"
    title="Report a bug"
    description="Tell us what went wrong so we can fix it."
    :ui="{ content: 'max-w-lg', body: 'overflow-y-auto max-h-[85vh]' }"
  >
    <template #body>
      <div v-if="pending" class="py-6 text-sm text-gray-500">Loading form…</div>
      <div v-else-if="loadError" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {{ loadError }}
      </div>
      <div v-else-if="!formDoc" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        This form is not available.
      </div>
      <div v-else-if="isInactive" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        This form is not currently accepting submissions.
      </div>
      <div v-else-if="success" class="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
        Thanks — your bug report was submitted.
        <span v-if="submissionId" class="block mt-1 text-sm text-green-900/80">Submission #{{ submissionId }}</span>
      </div>
      <ConnectFormRenderer
        v-else
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
  </UModal>
</template>

<script setup lang="ts">
import ConnectFormRenderer from '~/components/forms/ConnectFormRenderer.vue'
import { normalizeApiError } from '~/utils/forms/apiError'
import { applyProductAndTotalAnswers } from '~/utils/forms/productFields'
import { validateAnswersAgainstSchema, validateFormSchemaV1 } from '~/utils/forms/validation'

const REPORT_A_BUG_FORM_SLUG = 'report-a-bug'
const PAGE_URL_FIELD_ID = 'where-were-you'

const open = defineModel<boolean>('open', { default: false })

const formDoc = ref<any | null>(null)
const pending = ref(false)
const loadError = ref<string | null>(null)
const answers = ref<Record<string, unknown>>({})
const submitting = ref(false)
const submitError = ref<string | null>(null)
const validationErrors = ref<string[]>([])
const uploadProgress = ref<Record<string, number>>({})
const success = ref(false)
const submissionId = ref<string | number | null>(null)

const schema = computed(() => {
  const checked = validateFormSchemaV1(formDoc.value?.schema)
  return checked.valid ? checked.schema : null
})

const isInactive = computed(() => String(formDoc.value?.status || '').toLowerCase() === 'inactive')

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
  if (t === 'repeater' || t === 'list') return 'repeater'
  if (t === 'product' || t === 'singleproduct') return 'product'
  if (t === 'total') return 'total'
  if (t === 'html') return 'html'
  if (t === 'hidden') return 'hidden'
  return t
}

const fields = computed(() => {
  const s = schema.value
  if (!s) return []
  return s.fields.map((f: any) => ({
    key: f.id,
    label: f.label,
    description: f.id === PAGE_URL_FIELD_ID
      ? 'Pre-filled with the page you were on; change it if needed.'
      : f.description,
    type: normalizeRendererFieldType(f.type),
    required: !!f.required,
    choices: Array.isArray(f.options) ? f.options : undefined,
    columns: Array.isArray(f.columns) && f.columns.length
      ? f.columns.map((c: any) => ({
          id: String(c?.id ?? '').trim(),
          label: String(c?.label ?? c?.id ?? '').trim(),
        })).filter((c: any) => c.id)
      : undefined,
    unitPrice: typeof f.unitPrice === 'number' ? f.unitPrice : undefined,
    disableQuantity: !!f.disableQuantity,
    content: typeof f.content === 'string' ? f.content : undefined,
    defaultValue: typeof f.defaultValue === 'string' ? f.defaultValue : undefined,
  }))
})

function currentPageUrl(): string {
  if (import.meta.client && typeof window !== 'undefined') {
    return window.location.href
  }
  return ''
}

function resetFormState() {
  answers.value = {
    [PAGE_URL_FIELD_ID]: currentPageUrl(),
  }
  submitting.value = false
  submitError.value = null
  validationErrors.value = []
  uploadProgress.value = {}
  success.value = false
  submissionId.value = null
}

async function loadForm() {
  pending.value = true
  loadError.value = null
  try {
    const res: any = await $fetch(`/api/forms/${encodeURIComponent(REPORT_A_BUG_FORM_SLUG)}`)
    formDoc.value = res?.doc ?? null
    if (!formDoc.value) {
      loadError.value = 'Form not found.'
    }
  } catch (e: any) {
    formDoc.value = null
    loadError.value = normalizeApiError(e, 'Failed to load form.').message
  } finally {
    pending.value = false
  }
}

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

function normalizeAnswersForSubmit(rawAnswers: Record<string, unknown>, visibleFieldKeys: string[] = []) {
  const out: Record<string, unknown> = { ...rawAnswers }
  const s = schema.value
  if (!s) return out
  return applyProductAndTotalAnswers(s.fields, out, visibleFieldKeys)
}

async function submit(payload: {
  answers: Record<string, unknown>
  files: Record<string, File | null>
  visibleFieldKeys: string[]
}) {
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
    const normalizedAnswers = normalizeAnswersForSubmit(payload.answers, payload.visibleFieldKeys || [])
    const submitted: any = await $fetch('/api/form-submissions/submit', {
      method: 'POST',
      body: {
        formSlug: formDoc.value.slug || REPORT_A_BUG_FORM_SLUG,
        answers: normalizedAnswers,
      },
    })
    const id = submitted?.submissionId ?? submitted?.doc?.id ?? submitted?.id ?? null
    submissionId.value = id
    const files = Object.entries(payload.files || {}).filter(([, f]) => !!f) as Array<[string, File]>
    for (const [fieldKey, file] of files) {
      if (!id) break
      uploadProgress.value[fieldKey] = 10
      const fd = new FormData()
      fd.set('formSlug', String(formDoc.value.slug || REPORT_A_BUG_FORM_SLUG))
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

watch(open, async (isOpen) => {
  if (!isOpen) return
  resetFormState()
  if (!formDoc.value && !pending.value) {
    await loadForm()
  }
})
</script>

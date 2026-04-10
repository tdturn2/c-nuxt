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
            @submit="handleSubmit"
          />

          <div
            v-if="!success && !pending && formDoc && fields.length === 0"
            class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm space-y-2"
          >
            <div class="font-semibold">No fields detected.</div>
            <div>componentKey: <code class="text-xs">{{ String(formDoc.componentKey || '') }}</code></div>
            <div>schema paths checked: <code class="text-xs">schema.raw.fields</code>, <code class="text-xs">schema.fields</code></div>
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

type PayloadFindResponse<T> = { docs?: T[] }
type ConnectFormDoc = {
  id: number | string
  slug?: string
  title?: string
  componentKey?: string
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

const loadError = computed(() => {
  const e = error.value as any
  return e?.data?.message ?? e?.statusMessage ?? e?.message ?? null
})

function getGravityFields(doc: ConnectFormDoc): any[] {
  const schema = doc?.schema
  if (!schema) return []

  // Common variants
  if (schema?.raw?.fields && Array.isArray(schema.raw.fields)) return schema.raw.fields
  if (schema?.raw?.raw?.fields && Array.isArray(schema.raw.raw.fields)) return schema.raw.raw.fields
  if (schema?.raw?.schema?.fields && Array.isArray(schema.raw.schema.fields)) return schema.raw.schema.fields
  if (schema?.fields && Array.isArray(schema.fields)) return schema.fields
  // Payload sometimes stores "Gravity JSON" under numeric keys (e.g. schema["0"].fields)
  if (schema?.['0']?.fields && Array.isArray(schema['0'].fields)) return schema['0'].fields
  // Or: schema.form.fields
  if (schema?.form?.fields && Array.isArray(schema.form.fields)) return schema.form.fields

  // Some setups store raw as JSON string
  if (typeof schema?.raw === 'string') {
    try {
      const parsed = JSON.parse(schema.raw)
      if (parsed?.fields && Array.isArray(parsed.fields)) return parsed.fields
      if (parsed?.raw?.fields && Array.isArray(parsed.raw.fields)) return parsed.raw.fields
      if (parsed?.['0']?.fields && Array.isArray(parsed['0'].fields)) return parsed['0'].fields
    } catch {}
  }
  return []
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
  return getGravityFields(doc).map(toField).filter((x): x is Field => x != null)
})

const answers = ref<Record<string, unknown>>({})
const submitting = ref(false)
const submitError = ref<string | null>(null)
const success = ref(false)
const submissionId = ref<number | string | null>(null)

async function handleSubmit(payload: { answers: Record<string, unknown>; files: Record<string, File | null> }) {
  if (!formDoc.value) return
  submitError.value = null
  submitting.value = true
  try {
    const submitted: any = await $fetch('/api/form-submissions/submit', {
      method: 'POST',
      body: {
        formSlug: formDoc.value.slug,
        answers: payload.answers,
      },
    })

    const id = submitted?.submissionId ?? submitted?.doc?.id ?? submitted?.id ?? null
    submissionId.value = id

    // Upload files after submit
    const fileEntries = Object.entries(payload.files || {}).filter(([, f]) => !!f) as Array<[string, File]>
    for (const [fieldKey, file] of fileEntries) {
      if (!id) break
      const fd = new FormData()
      fd.set('formSlug', String(formDoc.value.slug || ''))
      fd.set('submissionId', String(id))
      fd.set('fieldKey', String(fieldKey))
      fd.set('file', file)
      await $fetch('/api/form-uploads/upload', { method: 'POST', body: fd })
    }

    success.value = true
  } catch (e: any) {
    submitError.value = e?.data?.message ?? e?.statusMessage ?? e?.message ?? 'Failed to submit.'
  } finally {
    submitting.value = false
  }
}
</script>


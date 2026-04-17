<template>
  <div class="space-y-6">
    <div v-if="localMessage" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {{ localMessage }}
    </div>
    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      {{ errorMessage }}
    </div>

    <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-gray-900">Form metadata</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input v-model="form.slug" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input v-model="form.title" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Component key</label>
          <input v-model="form.componentKey" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Editable mode</label>
          <select v-model="form.editableMode" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="immutable">immutable</option>
            <option value="versioned">versioned</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select v-model="form.status" class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Indexed fields (comma separated)</label>
          <input v-model="indexedFieldsInput" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Fields</h2>
        <button
          type="button"
          class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
          @click="addField"
        >
          Add field
        </button>
      </div>

      <div v-if="!form.schema.fields.length" class="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Add at least one field before saving.
      </div>

      <div class="mt-4 space-y-4">
        <div
          v-for="(field, idx) in form.schema.fields"
          :key="field.id || idx"
          class="rounded-md border border-gray-200 p-4"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Field ID</label>
              <input v-model="field.id" type="text" class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Label</label>
              <input v-model="field.label" type="text" class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select v-model="field.type" class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm">
                <option v-for="type in fieldTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </div>
            <div class="flex items-end gap-3">
              <label class="inline-flex items-center gap-2 text-xs text-gray-700">
                <input v-model="field.required" type="checkbox">
                Required
              </label>
            </div>
          </div>

          <div v-if="field.type === 'select' || field.type === 'radio' || field.type === 'checkbox'" class="mt-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">Options (label:value, comma separated)</label>
            <input
              :value="optionsInput(field)"
              type="text"
              class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              @input="onOptionsInput(field, $event)"
            >
          </div>

          <div v-if="field.type === 'file'" class="mt-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">Accepted file types (comma separated)</label>
            <input
              :value="(field.accept || []).join(', ')"
              type="text"
              class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              @input="onAcceptInput(field, $event)"
            >
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700" :disabled="idx === 0" @click="moveField(idx, -1)">Move up</button>
            <button type="button" class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700" :disabled="idx === form.schema.fields.length - 1" @click="moveField(idx, 1)">Move down</button>
            <button type="button" class="rounded border border-red-300 px-2 py-1 text-xs text-red-700" @click="removeField(idx)">Remove</button>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <button type="button" class="text-sm font-medium text-[rgba(13,94,130,1)]" @click="showJson = !showJson">
        {{ showJson ? 'Hide JSON preview' : 'Show JSON preview' }}
      </button>
      <pre v-if="showJson" class="mt-3 max-h-80 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">{{ JSON.stringify(form.schema, null, 2) }}</pre>
      <ul v-if="schemaErrors.length" class="mt-3 list-disc space-y-1 pl-6 text-sm text-red-700">
        <li v-for="(issue, i) in schemaErrors" :key="i">{{ issue }}</li>
      </ul>
    </section>

    <div class="flex items-center justify-end gap-3">
      <button type="button" class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700" @click="$emit('cancel')">Cancel</button>
      <button
        type="button"
        class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
        :disabled="saving"
        @click="onSave"
      >
        {{ saving ? 'Saving...' : resolvedSaveLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConnectFormDefinition, FormFieldType, FormSchemaV1, FormStatus } from '~/types/forms'
import { validateFormSchemaV1 } from '~/utils/forms/validation'

type BuilderState = {
  id?: string | number
  slug: string
  title: string
  status: FormStatus
  componentKey: string
  editableMode: 'immutable' | 'versioned'
  indexedFields: string[]
  viewerGroups: unknown[]
  schema: FormSchemaV1
}

const props = defineProps<{
  modelValue?: ConnectFormDefinition | null
  saving?: boolean
  errorMessage?: string | null
  saveLabel?: string
}>()

const emit = defineEmits<{
  (e: 'save', value: BuilderState): void
  (e: 'submit-form', value: BuilderState): void
  (e: 'cancel'): void
}>()

const fieldTypes: FormFieldType[] = ['text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'number', 'file']
const showJson = ref(false)
const schemaErrors = ref<string[]>([])
const localMessage = ref<string | null>(null)
const resolvedSaveLabel = computed(() => props.saveLabel || 'Save')

const form = ref<BuilderState>({
  slug: '',
  title: '',
  status: 'inactive',
  componentKey: 'default',
  editableMode: 'immutable',
  indexedFields: [],
  viewerGroups: [],
  schema: {
    version: 1,
    title: '',
    description: '',
    layout: { columns: 1 },
    fields: [
      {
        id: 'field_1',
        type: 'text',
        label: 'New field',
        required: false,
      },
    ],
    rules: [],
  },
})

const indexedFieldsInput = computed({
  get: () => form.value.indexedFields.join(', '),
  set: (value: string) => {
    form.value.indexedFields = value.split(',').map((v) => v.trim()).filter(Boolean)
  },
})

watch(
  () => props.modelValue,
  (val) => {
    if (!val) return
    const normalizedSchema = normalizeIncomingSchema(val.schema)
    form.value = {
      id: val.id,
      slug: val.slug || '',
      title: val.title || '',
      status: val.status || 'inactive',
      componentKey: val.componentKey || 'default',
      editableMode: val.editableMode || 'immutable',
      indexedFields: Array.isArray(val.indexedFields) ? val.indexedFields : [],
      viewerGroups: Array.isArray(val.viewerGroups) ? val.viewerGroups : [],
      schema: normalizedSchema,
    }
  },
  { immediate: true }
)

function normalizeIncomingSchema(schema: any): FormSchemaV1 {
  const candidates = [schema, schema?.raw, schema?.raw?.raw, schema?.raw?.schema, schema?.form, schema?.['0']]
  for (const candidate of candidates) {
    const checked = validateFormSchemaV1(candidate)
    if (checked.valid && checked.schema) {
      return checked.schema
    }
  }
  return {
    version: 1,
    fields: [],
    rules: [],
  }
}

function addField() {
  form.value.schema.fields.push({
    id: `field_${form.value.schema.fields.length + 1}`,
    type: 'text',
    label: 'New field',
    required: false,
  })
}

function removeField(index: number) {
  form.value.schema.fields.splice(index, 1)
}

function moveField(index: number, dir: -1 | 1) {
  const target = index + dir
  if (target < 0 || target >= form.value.schema.fields.length) return
  const fields = [...form.value.schema.fields]
  const [item] = fields.splice(index, 1)
  fields.splice(target, 0, item)
  form.value.schema.fields = fields
}

function optionsInput(field: FormSchemaV1['fields'][number]) {
  return (field.options || []).map((opt) => `${opt.label}:${opt.value}`).join(', ')
}

function setOptions(field: FormSchemaV1['fields'][number], input: string) {
  field.options = input
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [left, right] = chunk.split(':')
      const value = (right ?? left ?? '').trim()
      return { label: (left ?? '').trim() || value, value }
    })
    .filter((opt) => !!opt.value)
}

function onOptionsInput(field: FormSchemaV1['fields'][number], event: Event) {
  const value = (event.target as HTMLInputElement | null)?.value || ''
  setOptions(field, value)
}

function onAcceptInput(field: FormSchemaV1['fields'][number], event: Event) {
  const value = (event.target as HTMLInputElement | null)?.value || ''
  field.accept = value.split(',').map((v) => v.trim()).filter(Boolean)
}

function onSave() {
  localMessage.value = `Save clicked at ${new Date().toLocaleTimeString()}`
  const checked = validateFormSchemaV1(form.value.schema)
  schemaErrors.value = checked.errors
  if (!form.value.slug.trim()) {
    localMessage.value = 'Slug is required before saving.'
    return
  }
  if (!form.value.componentKey.trim()) {
    localMessage.value = 'Component key is required before saving.'
    return
  }
  if (!checked.valid || !checked.schema) {
    localMessage.value = 'Save blocked: fix the schema issues listed below.'
    return
  }
  emit('save', {
    ...form.value,
    schema: checked.schema,
  })
  emit('submit-form', {
    ...form.value,
    schema: checked.schema,
  })
}
</script>

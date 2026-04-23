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
          <div class="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
            <button
              type="button"
              class="rounded px-2 py-1 text-xs font-medium"
              :class="activeFieldTab[idx] === 'field' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'"
              @click="setFieldTab(idx, 'field')"
            >
              Field
            </button>
            <button
              type="button"
              class="rounded px-2 py-1 text-xs font-medium"
              :class="activeFieldTab[idx] === 'settings' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'"
              @click="setFieldTab(idx, 'settings')"
            >
              Settings
            </button>
          </div>

          <template v-if="activeFieldTab[idx] !== 'settings'">
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
          </template>

          <template v-else>
            <div class="space-y-3">
              <label class="inline-flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  :checked="hasConditionalRule(field)"
                  @change="toggleConditionalRule(field, $event)"
                >
                Conditional Logic
              </label>

              <div v-if="hasConditionalRule(field)" class="grid gap-3 sm:grid-cols-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Field</label>
                  <select
                    :value="ruleSourceFieldId(field)"
                    class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                    @change="setRuleSourceField(field, $event)"
                  >
                    <option value="">Select field…</option>
                    <option
                      v-for="opt in conditionSourceFields(field)"
                      :key="opt.id"
                      :value="opt.id"
                    >
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Operator</label>
                  <select
                    :value="ruleOperator(field)"
                    class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                    @change="setRuleOperator(field, $event)"
                  >
                    <option v-for="op in conditionOperators" :key="op.value" :value="op.value">
                      {{ op.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Value</label>
                  <template v-if="conditionValueControlType(field) === 'select'">
                    <select
                      :value="ruleValue(field)"
                      class="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                      @change="setRuleValue(field, $event)"
                    >
                      <option value="">Select value…</option>
                      <option
                        v-for="opt in conditionValueOptions(field)"
                        :key="`${opt.value}-${opt.label}`"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </option>
                    </select>
                  </template>
                  <template v-else>
                    <input
                      :value="ruleValue(field)"
                      :type="conditionValueControlType(field) === 'number' ? 'number' : 'text'"
                      class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      :placeholder="conditionValueControlType(field) === 'number' ? 'Enter number…' : 'Enter value…'"
                      @input="setRuleValue(field, $event)"
                    >
                  </template>
                </div>
              </div>
            </div>
          </template>

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

const fieldTypes: FormFieldType[] = ['text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'time', 'number', 'file', 'section']
const conditionOperators = [
  { label: 'is', value: 'is' },
  { label: 'is not', value: 'isnot' },
  { label: 'greater than', value: 'greater_than' },
  { label: 'less than', value: 'less_than' },
  { label: 'contains', value: 'contains' },
  { label: 'starts with', value: 'starts_with' },
  { label: 'ends with', value: 'ends_with' },
] as const
const activeFieldTab = ref<Record<number, 'field' | 'settings'>>({})
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
  const normalizeType = (raw: unknown): FormFieldType => {
    const t = String(raw ?? '').trim().toLowerCase()
    if (t === 'email') return 'text'
    if (t === 'datetime' || t === 'date_time') return 'date'
    if (t === 'upload') return 'file'
    if (t === 'dropdown') return 'select'
    if (t === 'radiogroup' || t === 'radio-group') return 'radio'
    if (t === 'multiselect' || t === 'multi_select') return 'checkbox'
    if (
      t === 'text' || t === 'textarea' || t === 'select' || t === 'radio' || t === 'checkbox' ||
      t === 'date' || t === 'time' || t === 'number' || t === 'file' || t === 'section'
    ) {
      return t as FormFieldType
    }
    return 'text'
  }

  const coerceCandidate = (candidate: any): any => {
    if (!candidate || typeof candidate !== 'object') return candidate
    const out: any = { ...candidate }
    const fields = Array.isArray(candidate.fields) ? candidate.fields : []
    out.fields = fields
      .map((field: any, idx: number) => {
        const id = String(field?.id ?? `field_${idx + 1}`).trim()
        if (!id) return null
        const type = normalizeType(field?.type)
        const coerced: any = {
          ...field,
          id,
          type,
          label: String(field?.label ?? id),
          required: !!field?.required,
        }
        if (Array.isArray(field?.options)) {
          coerced.options = field.options
            .map((opt: any) => ({
              label: String(opt?.label ?? opt?.text ?? opt?.value ?? '').trim(),
              value: String(opt?.value ?? opt?.text ?? '').trim(),
            }))
            .filter((opt: any) => opt.value)
        }
        return coerced
      })
      .filter((f: any) => f != null)
    return out
  }

  const candidates = [schema, schema?.raw, schema?.raw?.raw, schema?.raw?.schema, schema?.form, schema?.['0']]
  for (const candidate of candidates) {
    const checked = validateFormSchemaV1(coerceCandidate(candidate))
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

function setFieldTab(index: number, tab: 'field' | 'settings') {
  activeFieldTab.value[index] = tab
}

function removeField(index: number) {
  const field = form.value.schema.fields[index]
  form.value.schema.fields.splice(index, 1)
  if (field?.id) {
    form.value.schema.rules = (form.value.schema.rules || []).filter((r: any) => String(r?.targetFieldId || '') !== String(field.id))
  }
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

function conditionSourceFields(field: FormSchemaV1['fields'][number]) {
  return form.value.schema.fields
    .filter((f) => {
      const t = String(f.type || '').toLowerCase()
      return (
        String(f.id || '') &&
        String(f.id) !== String(field.id) &&
        (t === 'text' || t === 'select' || t === 'radio' || t === 'number')
      )
    })
    .map((f) => ({ id: String(f.id), label: String(f.label || f.id) }))
}

function conditionSourceFieldById(id: string) {
  return form.value.schema.fields.find((f) => String(f.id) === id) || null
}

function conditionValueOptions(field: FormSchemaV1['fields'][number]) {
  const sourceId = ruleSourceFieldId(field)
  if (!sourceId) return []
  const sourceField = conditionSourceFieldById(sourceId)
  if (!sourceField || !Array.isArray(sourceField.options)) return []
  return sourceField.options.map((o) => ({ label: String(o.label || o.value || ''), value: String(o.value || '') }))
}

function conditionValueControlType(field: FormSchemaV1['fields'][number]): 'text' | 'number' | 'select' {
  const sourceId = ruleSourceFieldId(field)
  if (!sourceId) return 'text'
  const sourceField = conditionSourceFieldById(sourceId)
  const t = String(sourceField?.type || '').toLowerCase()
  if (t === 'number') return 'number'
  if (t === 'select' || t === 'radio') return 'select'
  return 'text'
}

function getConditionalRule(field: FormSchemaV1['fields'][number]) {
  const rules = Array.isArray(form.value.schema.rules) ? form.value.schema.rules : []
  return (rules as any[]).find((rule) => rule?.type === 'gravityConditional' && String(rule?.targetFieldId || '') === String(field.id || '')) || null
}

function hasConditionalRule(field: FormSchemaV1['fields'][number]) {
  return !!getConditionalRule(field)
}

function ensureConditionalRule(field: FormSchemaV1['fields'][number]) {
  if (!field.id) return null
  const existing = getConditionalRule(field)
  if (existing) return existing
  const firstSource = conditionSourceFields(field)[0]?.id || ''
  const firstValue = firstSource
    ? (conditionSourceFieldById(firstSource)?.options?.[0]?.value ? String(conditionSourceFieldById(firstSource)?.options?.[0]?.value) : '')
    : ''
  const created: any = {
    type: 'gravityConditional',
    targetFieldId: String(field.id),
    actionType: 'show',
    logicType: 'all',
    conditions: [{ sourceFieldId: firstSource, operator: 'is', value: firstValue }],
  }
  form.value.schema.rules = [...(form.value.schema.rules || []), created]
  return created
}

function toggleConditionalRule(field: FormSchemaV1['fields'][number], event: Event) {
  const checked = (event.target as HTMLInputElement | null)?.checked
  if (checked) {
    ensureConditionalRule(field)
    return
  }
  form.value.schema.rules = (form.value.schema.rules || []).filter((rule: any) => !(rule?.type === 'gravityConditional' && String(rule?.targetFieldId || '') === String(field.id || '')))
}

function ruleSourceFieldId(field: FormSchemaV1['fields'][number]) {
  const rule = getConditionalRule(field)
  return String(rule?.conditions?.[0]?.sourceFieldId || '')
}

function ruleOperator(field: FormSchemaV1['fields'][number]) {
  const rule = getConditionalRule(field)
  return String(rule?.conditions?.[0]?.operator || 'is')
}

function ruleValue(field: FormSchemaV1['fields'][number]) {
  const rule = getConditionalRule(field)
  return String(rule?.conditions?.[0]?.value || '')
}

function setRuleSourceField(field: FormSchemaV1['fields'][number], event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value || ''
  const rule = ensureConditionalRule(field)
  if (!rule) return
  const source = conditionSourceFieldById(value)
  const sourceFirstValue = source?.options?.[0]?.value ? String(source.options[0].value) : ''
  rule.conditions = [{ ...(rule.conditions?.[0] || {}), sourceFieldId: value, value: sourceFirstValue }]
}

function setRuleOperator(field: FormSchemaV1['fields'][number], event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value || 'is'
  const rule = ensureConditionalRule(field)
  if (!rule) return
  rule.conditions = [{ ...(rule.conditions?.[0] || {}), operator: value }]
}

function setRuleValue(field: FormSchemaV1['fields'][number], event: Event) {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null
  const value = target?.value || ''
  const rule = ensureConditionalRule(field)
  if (!rule) return
  rule.conditions = [{ ...(rule.conditions?.[0] || {}), value }]
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

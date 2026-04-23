<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <template v-for="f in normalizedFields" :key="f.key">
      <div v-if="visibilityByField[f.key] !== false" class="space-y-1.5">
      <div v-if="f.type === 'section'" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <h3 class="text-sm font-semibold text-gray-900">{{ f.label || f.key }}</h3>
        <p v-if="f.description" class="mt-1 text-xs text-gray-600">{{ f.description }}</p>
      </div>
      <label v-else class="block text-sm font-medium text-gray-900">
        {{ f.label || f.key }}
        <span v-if="f.required" class="text-red-600">*</span>
      </label>

      <!-- Text-ish -->
      <input
        v-if="f.type === 'text' || f.type === 'email' || f.type === 'number' || f.type === 'date' || f.type === 'time'"
        v-model="answersProxy[f.key]"
        :type="f.type === 'number' ? 'number' : (f.type === 'email' ? 'email' : (f.type === 'date' ? 'date' : (f.type === 'time' ? 'datetime-local' : 'text')))"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
        :required="f.required && visibilityByField[f.key] !== false"
      >

      <textarea
        v-else-if="f.type === 'textarea'"
        v-model="answersProxy[f.key]"
        rows="4"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
        :required="f.required && visibilityByField[f.key] !== false"
      />

      <!-- Select -->
      <select
        v-else-if="f.type === 'select'"
        v-model="answersProxy[f.key]"
        class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
        :required="f.required && visibilityByField[f.key] !== false"
      >
        <option value="">Select…</option>
        <option v-for="c in f.choices" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>

      <!-- Radio -->
      <div v-else-if="f.type === 'radio'" class="space-y-1">
        <label v-for="c in f.choices" :key="c.value" class="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="radio"
            :name="f.key"
            :value="c.value"
            v-model="answersProxy[f.key]"
          >
          <span>{{ c.label }}</span>
        </label>
      </div>

      <!-- Checkbox (multi) -->
      <div v-else-if="f.type === 'checkbox'" class="space-y-1">
        <label v-for="c in f.choices" :key="c.value" class="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            :value="c.value"
            :checked="Array.isArray(answersProxy[f.key]) && (answersProxy[f.key] as any[]).includes(c.value)"
            @change="toggleCheckbox(f.key, c.value)"
          >
          <span>{{ c.label }}</span>
        </label>
      </div>

      <!-- File (after submit upload) -->
      <input
        v-else-if="f.type === 'file'"
        type="file"
        class="block w-full text-sm text-gray-700"
        @change="onFileChange(f.key, $event)"
        :required="f.required && visibilityByField[f.key] !== false"
      >
      <input
        v-else
        v-model="answersProxy[f.key]"
        type="text"
        class="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
        :required="f.required && visibilityByField[f.key] !== false"
      >
      <p v-if="f.type === 'file' && props.uploadProgress && props.uploadProgress[f.key] != null" class="text-xs text-gray-500">
        Upload progress: {{ props.uploadProgress[f.key] }}%
      </p>

      <p v-if="f.description" class="text-xs text-gray-500">{{ f.description }}</p>
      </div>
    </template>

    <div class="flex items-center gap-2 pt-2">
      <button
        type="submit"
        class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
        :disabled="submitting"
      >
        {{ submitting ? 'Submitting…' : 'Submit' }}
      </button>
      <span v-if="error" class="text-sm text-red-600">{{ error }}</span>
    </div>
    <ul v-if="validationErrors?.length" class="list-disc space-y-1 pl-5 text-sm text-red-700">
      <li v-for="(msg, i) in validationErrors" :key="i">{{ msg }}</li>
    </ul>
  </form>
</template>

<script setup lang="ts">
type Choice = { label: string; value: string }
type Field = {
  key: string
  label?: string
  description?: string
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'time' | 'file' | 'section' | string
  required?: boolean
  choices?: Choice[]
}

type ConditionalRule = {
  type?: string
  targetFieldId?: string
  actionType?: string
  logicType?: string
  conditions?: Array<{
    sourceFieldId?: string
    operator?: string
    value?: string
  }>
}

const props = defineProps<{
  fields: Field[]
  rules?: ConditionalRule[]
  modelValue: Record<string, unknown>
  submitting?: boolean
  error?: string | null
  validationErrors?: string[]
  uploadProgress?: Record<string, number>
}>()

const validationErrors = computed(() => props.validationErrors || [])

function canonicalFieldType(raw: unknown): string {
  const t = String(raw ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .toLowerCase()
  if (!t) return 'text'
  if (t.includes('textarea') || t.includes('longtext') || t.includes('paragraph')) return 'textarea'
  if (t.includes('text')) return 'text'
  if (t === 'text' || t === 'shorttext' || t === 'short_text' || t === 'textfield' || t === 'textinput') return 'text'
  if (t === 'textarea' || t === 'longtext' || t === 'long_text' || t === 'paragraph') return 'textarea'
  if (t === 'email' || t === 'e-mail') return 'email'
  if (t === 'number' || t === 'numeric' || t === 'integer' || t === 'decimal') return 'number'
  if (t === 'date' || t === 'datetime' || t === 'date_time') return 'date'
  if (t === 'time' || t === 'datetime-local' || t === 'datetime_local') return 'time'
  if (t === 'select' || t === 'dropdown') return 'select'
  if (t === 'radio' || t === 'radio-group' || t === 'radiogroup') return 'radio'
  if (t === 'checkbox' || t === 'multi_select' || t === 'multiselect') return 'checkbox'
  if (t === 'file' || t === 'upload') return 'file'
  if (t === 'section') return 'section'
  return t
}

const normalizedFields = computed<Field[]>(() =>
  (props.fields || []).map((f) => ({
    ...f,
    type: canonicalFieldType(f.type),
    choices: Array.isArray(f.choices) ? f.choices : undefined,
  })),
)

function valuesInclude(value: unknown, expected: string): boolean {
  if (Array.isArray(value)) return value.map((v) => String(v)).includes(expected)
  return String(value ?? '') === expected
}

function conditionPasses(operator: string, currentValue: unknown, expectedValue: string): boolean {
  if (operator === 'isnot' || operator === 'is_not' || operator === '!=' || operator === 'not_equal') {
    return !valuesInclude(currentValue, expectedValue)
  }
  const current = String(currentValue ?? '')
  const expected = String(expectedValue ?? '')
  if (operator === 'greater_than' || operator === '>') {
    return Number(current) > Number(expected)
  }
  if (operator === 'less_than' || operator === '<') {
    return Number(current) < Number(expected)
  }
  if (operator === 'contains') {
    return current.toLowerCase().includes(expected.toLowerCase())
  }
  if (operator === 'starts_with') {
    return current.toLowerCase().startsWith(expected.toLowerCase())
  }
  if (operator === 'ends_with') {
    return current.toLowerCase().endsWith(expected.toLowerCase())
  }
  return valuesInclude(currentValue, expectedValue)
}

const emit = defineEmits<{
  (e: 'update:modelValue', v: Record<string, unknown>): void
  (e: 'submit', v: { answers: Record<string, unknown>; files: Record<string, File | null>; visibleFieldKeys: string[] }): void
}>()

const filesByKey = ref<Record<string, File | null>>({})

const answersProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const visibilityByField = computed<Record<string, boolean>>(() => {
  const out: Record<string, boolean> = {}
  const rules = Array.isArray(props.rules) ? props.rules : []
  for (const field of normalizedFields.value) out[field.key] = true

  for (const rawRule of rules) {
    if (!rawRule || rawRule.type !== 'gravityConditional') continue
    const target = String(rawRule.targetFieldId || '').trim()
    if (!target || !(target in out)) continue
    const action = String(rawRule.actionType || 'show').toLowerCase()
    const logicType = String(rawRule.logicType || 'all').toLowerCase()
    const conditions = Array.isArray(rawRule.conditions) ? rawRule.conditions : []
    if (!conditions.length) continue
    const results = conditions.map((condition) => {
      const sourceKey = String(condition?.sourceFieldId || '').trim()
      const operator = String(condition?.operator || 'is').toLowerCase()
      const expected = String(condition?.value || '')
      const current = answersProxy.value[sourceKey]
      return conditionPasses(operator, current, expected)
    })
    const matches = logicType === 'any' ? results.some(Boolean) : results.every(Boolean)
    out[target] = action === 'hide' ? !matches : matches
  }

  return out
})

function toggleCheckbox(key: string, value: string) {
  const cur = answersProxy.value[key]
  const arr = Array.isArray(cur) ? [...cur] : []
  const idx = arr.indexOf(value)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(value)
  answersProxy.value = { ...answersProxy.value, [key]: arr }
}

function onFileChange(key: string, e: Event) {
  const input = e.target as HTMLInputElement | null
  const file = input?.files?.[0] || null
  filesByKey.value = { ...filesByKey.value, [key]: file }
}

function onSubmit() {
  const visibleFieldKeys = normalizedFields.value
    .filter((field) => visibilityByField.value[field.key] !== false)
    .map((field) => field.key)
  emit('submit', { answers: answersProxy.value, files: filesByKey.value, visibleFieldKeys })
}
</script>


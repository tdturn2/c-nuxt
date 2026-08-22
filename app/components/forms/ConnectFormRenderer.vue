<template>
  <form class="space-y-4" @submit.prevent="onSubmit">
    <template v-for="f in normalizedFields" :key="f.key">
      <div v-if="visibilityByField[f.key] !== false" class="space-y-1.5">
      <div v-if="f.type === 'section'" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
        <h3 class="text-sm font-semibold text-gray-900">{{ f.label || f.key }}</h3>
        <p v-if="f.description" class="mt-1 text-xs text-gray-600">{{ f.description }}</p>
      </div>
      <div
        v-else-if="f.type === 'html'"
        class="prose prose-sm max-w-none text-gray-800"
        v-html="f.content || ''"
      />
      <input
        v-else-if="f.type === 'hidden'"
        type="hidden"
        :value="String(answersProxy[f.key] ?? '')"
      >
      <div v-else-if="f.type === 'product'" class="rounded-md border border-gray-200 bg-white p-3">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-gray-900">
              {{ f.label || f.key }}
              <span v-if="f.required" class="text-red-600">*</span>
            </p>
            <p v-if="f.description" class="mt-0.5 text-xs text-gray-600">{{ f.description }}</p>
            <p class="mt-1 text-sm text-gray-700">{{ formatMoney(Number(f.unitPrice || 0)) }} each</p>
          </div>
          <div v-if="!f.disableQuantity" class="w-28">
            <label class="mb-1 block text-xs font-medium text-gray-700">Quantity</label>
            <input
              :value="productQuantity(f.key)"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
              :required="f.required && visibilityByField[f.key] !== false"
              @input="onProductQuantityInput(f, $event)"
            >
          </div>
        </div>
        <p class="mt-2 text-sm text-gray-800">
          Line total: <span class="font-semibold">{{ formatMoney(productLineTotal(f)) }}</span>
        </p>
      </div>
      <div v-else-if="f.type === 'total'" class="rounded-md border border-[rgba(13,94,130,0.25)] bg-[rgba(13,94,130,0.06)] px-3 py-3">
        <p class="text-sm font-medium text-gray-900">{{ f.label || 'Total' }}</p>
        <p class="mt-1 text-xl font-semibold text-[rgba(13,94,130,1)]">{{ formatMoney(productsTotal) }}</p>
      </div>
      <template v-else>
      <label class="block text-sm font-medium text-gray-900">
        {{ f.label || f.key }}
        <span v-if="f.required" class="text-red-600">*</span>
      </label>
      <p v-if="f.description" class="text-xs text-gray-600">{{ f.description }}</p>

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

      <!-- Repeater: one or more rows of defined text columns -->
      <div v-else-if="f.type === 'repeater'" class="space-y-3">
        <div
          v-for="(row, rowIdx) in repeaterRows(f.key, columnsForField(f))"
          :key="`${f.key}-row-${rowIdx}`"
          class="flex flex-wrap items-end gap-3"
        >
          <div
            v-for="col in columnsForField(f)"
            :key="`${f.key}-${rowIdx}-${col.id}`"
            class="min-w-[9rem] flex-1"
          >
            <label class="mb-1 block text-xs font-medium text-gray-700">{{ col.label || col.id }}</label>
            <input
              type="text"
              :value="String(row[col.id] ?? '')"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(13,94,130,0.25)] focus:border-[rgba(13,94,130,1)]"
              @input="onRepeaterInput(f.key, columnsForField(f), rowIdx, col.id, $event)"
            >
          </div>
          <button
            v-if="repeaterRows(f.key, columnsForField(f)).length > 1"
            type="button"
            class="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
            :aria-label="`Remove row ${rowIdx + 1}`"
            @click="removeRepeaterRow(f.key, columnsForField(f), rowIdx)"
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            v-if="rowIdx === repeaterRows(f.key, columnsForField(f)).length - 1"
            type="button"
            class="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(13,94,130,0.35)] bg-[rgba(13,94,130,1)] text-white hover:bg-[rgba(10,69,92,1)]"
            aria-label="Add row"
            @click="addRepeaterRow(f.key, columnsForField(f))"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

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
      </template>
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
import { applyProductAndTotalAnswers, formatMoney, normalizeProductAnswer, resolveFormMergeTags, sumProductAnswers } from '~/utils/forms/productFields'

type Choice = { label: string; value: string }
type RepeaterColumn = { id: string; label: string }
type Field = {
  key: string
  label?: string
  description?: string
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'time' | 'file' | 'section' | 'repeater' | 'product' | 'total' | 'html' | 'hidden' | string
  required?: boolean
  choices?: Choice[]
  columns?: RepeaterColumn[]
  unitPrice?: number
  disableQuantity?: boolean
  content?: string
  defaultValue?: string
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
  if (t === 'product' || t === 'singleproduct') return 'product'
  if (t === 'total') return 'total'
  if (t === 'html') return 'html'
  if (t === 'hidden') return 'hidden'
  if (t === 'repeater' || t === 'list') return 'repeater'
  if (t.includes('textarea') || t.includes('longtext') || t.includes('paragraph')) return 'textarea'
  if (t === 'text' || t === 'shorttext' || t === 'short_text' || t === 'textfield' || t === 'textinput') return 'text'
  if (t.includes('text')) return 'text'
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
    columns: Array.isArray(f.columns)
      ? f.columns
          .map((col) => ({
            id: String(col?.id ?? '').trim(),
            label: String(col?.label ?? col?.id ?? '').trim(),
          }))
          .filter((col) => col.id)
      : undefined,
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

const { data: session } = useAuth()
const viewerEmail = computed(() => String((session.value as any)?.user?.email || '').trim())

const productsTotal = computed(() => {
  const visible = new Set(
    normalizedFields.value
      .filter((field) => visibilityByField.value[field.key] !== false)
      .map((field) => field.key),
  )
  return sumProductAnswers(
    normalizedFields.value.map((field) => ({
      id: field.key,
      type: field.type,
      label: field.label,
      unitPrice: field.unitPrice,
    })),
    answersProxy.value,
    visible,
  )
})

function productQuantity(key: string): number {
  return normalizeProductAnswer({ unitPrice: 0 }, answersProxy.value[key]).quantity
}

function productLineTotal(field: Field): number {
  return normalizeProductAnswer(
    { label: field.label, unitPrice: field.unitPrice },
    answersProxy.value[field.key],
  ).lineTotal
}

function onProductQuantityInput(field: Field, event: Event) {
  const quantity = Math.max(0, Math.floor(Number((event.target as HTMLInputElement | null)?.value || 0)))
  answersProxy.value = {
    ...answersProxy.value,
    [field.key]: normalizeProductAnswer(
      { label: field.label, unitPrice: field.unitPrice },
      { quantity, price: field.unitPrice, name: field.label },
    ),
  }
}

watch(
  [normalizedFields, viewerEmail],
  () => {
    const next = { ...answersProxy.value }
    let changed = false
    for (const field of normalizedFields.value) {
      if (field.type === 'hidden') {
        const resolved = resolveFormMergeTags(field.defaultValue, { email: viewerEmail.value })
        if (String(next[field.key] ?? '') !== resolved) {
          next[field.key] = resolved
          changed = true
        }
      }
      if (field.type === 'product' && (next[field.key] == null || next[field.key] === '')) {
        next[field.key] = normalizeProductAnswer(
          { label: field.label, unitPrice: field.unitPrice },
          { quantity: field.disableQuantity ? 1 : 0, price: field.unitPrice, name: field.label },
        )
        changed = true
      }
    }
    if (changed) answersProxy.value = next
  },
  { immediate: true },
)

function toggleCheckbox(key: string, value: string) {
  const cur = answersProxy.value[key]
  const arr = Array.isArray(cur) ? [...cur] : []
  const idx = arr.indexOf(value)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(value)
  answersProxy.value = { ...answersProxy.value, [key]: arr }
}

function emptyRepeaterRow(columns?: RepeaterColumn[]): Record<string, string> {
  const row: Record<string, string> = {}
  for (const col of columns || []) row[col.id] = ''
  return row
}

function columnsForField(field: Field): RepeaterColumn[] {
  const raw = field.columns as unknown
  const list = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object'
        ? Object.keys(raw as Record<string, unknown>)
            .filter((k) => /^\d+$/.test(k))
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => (raw as Record<string, unknown>)[k])
        : [])
  const cols = list
    .map((col: any) => ({
      id: String(col?.id ?? '').trim(),
      label: String(col?.label ?? col?.id ?? '').trim(),
    }))
    .filter((col) => col.id)
  if (cols.length) return cols
  const label = String(field.label || 'Value').trim() || 'Value'
  const id = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'value'
  return [{ id, label }]
}

function repeaterRows(key: string, columns?: RepeaterColumn[]): Record<string, string>[] {
  const cur = answersProxy.value[key]
  if (Array.isArray(cur) && cur.length) {
    return cur.map((row) => {
      const out = emptyRepeaterRow(columns)
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        for (const col of columns || []) {
          out[col.id] = String((row as Record<string, unknown>)[col.id] ?? '')
        }
      }
      return out
    })
  }
  return [emptyRepeaterRow(columns)]
}

function setRepeaterRows(key: string, rows: Record<string, string>[]) {
  answersProxy.value = { ...answersProxy.value, [key]: rows }
}

function updateRepeaterCell(
  key: string,
  columns: RepeaterColumn[] | undefined,
  rowIdx: number,
  columnId: string,
  value: string,
) {
  const rows = repeaterRows(key, columns).map((row) => ({ ...row }))
  if (!rows[rowIdx]) rows[rowIdx] = emptyRepeaterRow(columns)
  rows[rowIdx][columnId] = value
  setRepeaterRows(key, rows)
}

function onRepeaterInput(
  key: string,
  columns: RepeaterColumn[] | undefined,
  rowIdx: number,
  columnId: string,
  event: Event,
) {
  const value = (event.target as HTMLInputElement | null)?.value ?? ''
  updateRepeaterCell(key, columns, rowIdx, columnId, value)
}

function addRepeaterRow(key: string, columns?: RepeaterColumn[]) {
  const rows = [...repeaterRows(key, columns), emptyRepeaterRow(columns)]
  setRepeaterRows(key, rows)
}

function removeRepeaterRow(key: string, columns: RepeaterColumn[] | undefined, rowIdx: number) {
  const rows = repeaterRows(key, columns)
  if (rows.length <= 1) return
  setRepeaterRows(key, rows.filter((_, i) => i !== rowIdx))
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
  const answers = applyProductAndTotalAnswers(
    normalizedFields.value.map((field) => ({
      id: field.key,
      type: field.type,
      label: field.label,
      unitPrice: field.unitPrice,
    })),
    answersProxy.value,
    visibleFieldKeys,
  )
  emit('update:modelValue', answers)
  emit('submit', { answers, files: filesByKey.value, visibleFieldKeys })
}
</script>


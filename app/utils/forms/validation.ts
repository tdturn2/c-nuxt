import type { FormFieldType, FormSchemaV1 } from '~/types/forms'

const FORM_FIELD_TYPES = new Set<FormFieldType>([
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'date',
  'time',
  'number',
  'file',
  'section',
  'repeater',
])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function slugifyColumnId(label: string, fallbackIndex: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug || `column_${fallbackIndex + 1}`
}

/** Payload JSON sometimes returns arrays as `{ "0": {...}, "1": {...} }`. */
function coerceToArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!isPlainObject(value)) return []
  const keys = Object.keys(value)
  if (!keys.length) return []
  if (!keys.every((k) => /^\d+$/.test(k))) return []
  return keys
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => value[k])
}

function normalizeRepeaterColumns(
  rawColumns: unknown,
  fallbackLabel?: string,
): Array<{ id: string; label: string }> {
  const list = coerceToArray(rawColumns)
    .map((col, colIdx) => {
      const item = isPlainObject(col) ? col : {}
      const colLabel = String(item.label ?? item.name ?? item.text ?? '').trim()
      const colId =
        String(item.id ?? item.key ?? item.name ?? '').trim() || slugifyColumnId(colLabel, colIdx)
      if (!colId) return null
      return { id: colId, label: colLabel || colId }
    })
    .filter((col): col is { id: string; label: string } => col != null)

  if (list.length) return list

  const label = String(fallbackLabel || '').trim() || 'Value'
  return [{ id: slugifyColumnId(label, 0), label }]
}

export function validateFormSchemaV1(schema: unknown): { valid: boolean; errors: string[]; schema: FormSchemaV1 | null } {
  const errors: string[] = []
  if (!isPlainObject(schema)) {
    return { valid: false, errors: ['Schema must be an object.'], schema: null }
  }

  const fieldsSource = Array.isArray(schema.fields) ? schema.fields : coerceToArray(schema.fields)
  if (!fieldsSource.length) errors.push('Add at least one field.')

  const ids = new Set<string>()
  const fields = fieldsSource.map((raw, idx) => {
    const field = isPlainObject(raw) ? raw : {}
    const id = String(field.id ?? '').trim()
    const type = String(field.type ?? '').trim().toLowerCase()

    if (!id) errors.push(`Field ${idx + 1}: id is required.`)
    if (id && ids.has(id)) errors.push(`Field ${idx + 1}: duplicate id "${id}".`)
    if (id) ids.add(id)

    if (!FORM_FIELD_TYPES.has(type as FormFieldType)) {
      errors.push(`Field ${idx + 1}: unsupported type "${type}".`)
    }

    const options =
      (type === 'select' || type === 'radio' || type === 'checkbox')
        ? coerceToArray(field.options)
            .map((opt) => {
              const item = isPlainObject(opt) ? opt : {}
              return { label: String(item.label ?? '').trim(), value: String(item.value ?? '').trim() }
            })
            .filter((opt) => opt.value)
        : undefined

    const accept = Array.isArray(field.accept)
      ? field.accept.map((v) => String(v || '').trim()).filter(Boolean)
      : coerceToArray(field.accept).map((v) => String(v || '').trim()).filter(Boolean)

    const label = String(field.label ?? id)
    const columns = type === 'repeater' ? normalizeRepeaterColumns(field.columns, label) : undefined

    return {
      id,
      type: (FORM_FIELD_TYPES.has(type as FormFieldType) ? type : 'text') as FormFieldType,
      label,
      description: typeof field.description === 'string' ? field.description : undefined,
      required: !!field.required,
      options: options?.length ? options : undefined,
      accept: accept.length ? accept : undefined,
      columns,
    }
  })

  const normalized: FormSchemaV1 = {
    version: Number.isFinite(Number(schema.version)) ? Number(schema.version) : 1,
    title: typeof schema.title === 'string' ? schema.title : undefined,
    description: typeof schema.description === 'string' ? schema.description : undefined,
    layout: isPlainObject(schema.layout) ? { columns: Number(schema.layout.columns || 1) } : undefined,
    fields,
    rules: Array.isArray(schema.rules) ? schema.rules : coerceToArray(schema.rules),
    emailNotification: isPlainObject(schema.emailNotification)
      ? {
          enabled: schema.emailNotification.enabled === true,
          to: typeof schema.emailNotification.to === 'string' ? schema.emailNotification.to : '',
          from:
            typeof schema.emailNotification.from === 'string' && schema.emailNotification.from.trim()
              ? schema.emailNotification.from.trim()
              : 'webdeveloper@asburyseminary.edu',
          subject:
            typeof schema.emailNotification.subject === 'string'
              ? schema.emailNotification.subject
              : undefined,
        }
      : undefined,
  }

  return { valid: errors.length === 0, errors, schema: errors.length ? null : normalized }
}

export function validateAnswersAgainstSchema(
  schema: FormSchemaV1,
  answers: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  for (const field of schema.fields) {
    const value = answers[field.id]
    if (!field.required) continue

    if (field.type === 'checkbox') {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push(`${field.label || field.id} is required.`)
      }
      continue
    }

    if (field.type === 'repeater') {
      const columns = Array.isArray(field.columns) ? field.columns : []
      const rows = Array.isArray(value) ? value : []
      if (!rows.length) {
        errors.push(`${field.label || field.id} is required.`)
        continue
      }
      const hasCompleteRow = rows.some((row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return false
        const obj = row as Record<string, unknown>
        if (!columns.length) {
          return Object.values(obj).some((v) => String(v ?? '').trim() !== '')
        }
        return columns.every((col) => String(obj[col.id] ?? '').trim() !== '')
      })
      if (!hasCompleteRow) {
        errors.push(`${field.label || field.id} is required.`)
      }
      continue
    }

    if (field.type === 'file' || field.type === 'section') {
      continue
    }

    if (value == null || String(value).trim() === '') {
      errors.push(`${field.label || field.id} is required.`)
    }
  }
  return { valid: errors.length === 0, errors }
}

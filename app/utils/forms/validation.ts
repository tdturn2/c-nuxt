import type { FormFieldType, FormSchemaV1 } from '~/types/forms'

const FORM_FIELD_TYPES = new Set<FormFieldType>([
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'date',
  'number',
  'file',
])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

export function validateFormSchemaV1(schema: unknown): { valid: boolean; errors: string[]; schema: FormSchemaV1 | null } {
  const errors: string[] = []
  if (!isPlainObject(schema)) {
    return { valid: false, errors: ['Schema must be an object.'], schema: null }
  }

  const rawFields = Array.isArray(schema.fields) ? schema.fields : []
  if (!rawFields.length) errors.push('Add at least one field.')

  const ids = new Set<string>()
  const fields = rawFields.map((raw, idx) => {
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
      Array.isArray(field.options) && (type === 'select' || type === 'radio' || type === 'checkbox')
        ? field.options
            .map((opt) => {
              const item = isPlainObject(opt) ? opt : {}
              return { label: String(item.label ?? '').trim(), value: String(item.value ?? '').trim() }
            })
            .filter((opt) => opt.value)
        : undefined

    const accept = Array.isArray(field.accept) ? field.accept.map((v) => String(v || '').trim()).filter(Boolean) : undefined

    return {
      id,
      type: (FORM_FIELD_TYPES.has(type as FormFieldType) ? type : 'text') as FormFieldType,
      label: String(field.label ?? id),
      description: typeof field.description === 'string' ? field.description : undefined,
      required: !!field.required,
      options,
      accept,
    }
  })

  const normalized: FormSchemaV1 = {
    version: Number.isFinite(Number(schema.version)) ? Number(schema.version) : 1,
    title: typeof schema.title === 'string' ? schema.title : undefined,
    description: typeof schema.description === 'string' ? schema.description : undefined,
    layout: isPlainObject(schema.layout) ? { columns: Number(schema.layout.columns || 1) } : undefined,
    fields,
    rules: Array.isArray(schema.rules) ? schema.rules : [],
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

    if (field.type === 'file') {
      continue
    }

    if (value == null || String(value).trim() === '') {
      errors.push(`${field.label || field.id} is required.`)
    }
  }
  return { valid: errors.length === 0, errors }
}

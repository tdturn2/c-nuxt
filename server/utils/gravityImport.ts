import { createError } from 'h3'
import { validateFormSchemaV1 } from '../../app/utils/forms/validation'
import type { DashboardFormSchema, FormFieldType } from './dashboardForms'

type GravityChoice = {
  text?: string
  value?: string
  isSelected?: boolean
}

type GravityConditionalLogic = {
  enabled?: boolean
  actionType?: string
  logicType?: string
  rules?: Array<{ fieldId?: string | number; operator?: string; value?: string }>
}

type GravityField = {
  id?: string | number
  type?: string
  label?: string
  description?: string
  isRequired?: boolean
  choices?: GravityChoice[] | ''
  conditionalLogic?: GravityConditionalLogic | '' | null
  placeholder?: string
  defaultValue?: string
  inputs?: Array<{ id?: string | number; label?: string }>
}

type GravityFormLike = {
  id?: string | number
  title?: string
  description?: string
  fields?: GravityField[]
  save?: { enabled?: string | boolean }
  notifications?: unknown[]
  confirmations?: unknown[]
}

type ParsedGravityExport = {
  forms: GravityFormLike[]
  version?: string
}

type ImportMode = 'dryRun' | 'commit'

export type GravityImportIssue = {
  code: string
  message: string
  path?: string
}

export type GravityImportCandidate = {
  gravityFormId: string
  slug: string
  title: string
  payload: {
    slug: string
    title: string
    componentKey: string
    editableMode: 'immutable' | 'versioned'
    status: 'inactive'
    indexedFields: Array<{ key: string }>
    viewerGroups: unknown[]
    schema: DashboardFormSchema
  }
}

export type GravityImportFormResult = {
  gravityFormId: string
  title: string
  slug: string
  blockers: GravityImportIssue[]
  warnings: GravityImportIssue[]
  candidate: GravityImportCandidate | null
}

export type GravityImportReport = {
  mode: ImportMode
  totals: {
    parsedForms: number
    validForms: number
    blockedForms: number
  }
  forms: GravityImportFormResult[]
}

const SUPPORTED_FIELD_TYPES = new Set([
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
] as const)

const FIELD_TYPE_MAP: Record<string, FormFieldType | null> = {
  text: 'text',
  textarea: 'textarea',
  select: 'select',
  radio: 'radio',
  checkbox: 'checkbox',
  date: 'date',
  time: 'time',
  number: 'number',
  fileupload: 'file',
  email: 'text',
  phone: 'text',
  name: 'text',
  address: 'textarea',
  list: 'textarea',
  section: 'section',
}

function safeString(value: unknown): string {
  return String(value ?? '').trim()
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeFieldId(formId: string, fieldId: string | number): string {
  return `gf_${formId}_${String(fieldId).replace(/[^\w.-]+/g, '_')}`
}

function parseGravityExport(raw: unknown): ParsedGravityExport {
  const data = raw as any
  if (!data || typeof data !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Gravity import payload must be an object' })
  }

  if (Array.isArray(data.forms)) {
    return { forms: data.forms, version: safeString(data.version) || undefined }
  }

  if (Array.isArray(data)) {
    return { forms: data, version: undefined }
  }

  const forms: GravityFormLike[] = []
  for (const [key, value] of Object.entries(data)) {
    if (key === 'version') continue
    if (!value || typeof value !== 'object') continue
    forms.push(value as GravityFormLike)
  }
  return { forms, version: safeString(data.version) || undefined }
}

function hasConditionalLogic(field: GravityField): boolean {
  const raw = field.conditionalLogic
  if (!raw || typeof raw !== 'object') return false
  const logic = raw as GravityConditionalLogic
  if (logic.enabled === false || logic.enabled === 'false') return false
  if (!Array.isArray(logic.rules) || !logic.rules.length) return false
  return true
}

function hasUnsupportedFieldType(type: string): boolean {
  const mapped = FIELD_TYPE_MAP[type]
  return !mapped || !SUPPORTED_FIELD_TYPES.has(mapped)
}

function mapChoices(field: GravityField) {
  if (!Array.isArray(field.choices)) return undefined
  const options = field.choices
    .map((choice) => {
      const value = safeString(choice?.value || choice?.text)
      if (!value) return null
      return {
        label: safeString(choice?.text || choice?.value || value),
        value,
      }
    })
    .filter((v): v is { label: string; value: string } => v != null)
  return options.length ? options : undefined
}

function mapField(formId: string, field: GravityField, idx: number): DashboardFormSchema['fields'][number] {
  const idRaw = field.id
  if (idRaw == null || idRaw === '') {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported Gravity field at index ${idx}: missing id`,
    })
  }

  const gravityType = safeString(field.type).toLowerCase()
  const mappedType = FIELD_TYPE_MAP[gravityType]
  if (!mappedType || !SUPPORTED_FIELD_TYPES.has(mappedType)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unsupported Gravity field type "${gravityType}" for field ${idRaw}`,
    })
  }

  const label = safeString(field.label) || `Field ${idRaw}`
  const descriptionBits = [safeString(field.description)]
  if (gravityType === 'name' && Array.isArray(field.inputs) && field.inputs.length) {
    descriptionBits.push(
      `Name parts: ${field.inputs.map((inp) => safeString(inp.label)).filter(Boolean).join(', ')}`,
    )
  }
  if (gravityType === 'address' && Array.isArray(field.inputs) && field.inputs.length) {
    descriptionBits.push(
      `Address parts: ${field.inputs.map((inp) => safeString(inp.label)).filter(Boolean).join(', ')}`,
    )
  }
  if (gravityType === 'time') {
    descriptionBits.push('Expected format: YYYY-MM-DD HH:MM:SS')
  }
  if (gravityType === 'section') {
    descriptionBits.push('Section/grouping field')
  }

  const out: DashboardFormSchema['fields'][number] = {
    id: normalizeFieldId(formId, idRaw),
    type: mappedType,
    label,
    required: !!field.isRequired,
    description: descriptionBits.filter(Boolean).join(' ').trim() || undefined,
  }

  const options = mapChoices(field)
  if (options && (mappedType === 'select' || mappedType === 'radio' || mappedType === 'checkbox')) {
    out.options = options
  }
  if (mappedType === 'file') {
    out.accept = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
  }
  return out
}

function mapConditionalRule(formId: string, field: GravityField, idx: number) {
  if (!hasConditionalLogic(field)) return null
  const logic = field.conditionalLogic as GravityConditionalLogic
  const fieldIdRaw = field.id
  if (fieldIdRaw == null || fieldIdRaw === '') return null
  return {
    type: 'gravityConditional',
    targetFieldId: normalizeFieldId(formId, fieldIdRaw),
    actionType: safeString(logic.actionType || 'show') || 'show',
    logicType: safeString(logic.logicType || 'all') || 'all',
    conditions: (logic.rules || []).map((rule, rIdx) => ({
      sourceFieldId: normalizeFieldId(formId, safeString(rule.fieldId || `unknown_${idx}_${rIdx}`)),
      operator: safeString(rule.operator || 'is') || 'is',
      value: safeString(rule.value || ''),
    })),
  }
}

function analyzeForm(input: GravityFormLike): GravityImportFormResult {
  const gravityFormId = safeString(input.id) || 'unknown'
  const title = safeString(input.title) || `Gravity Form ${gravityFormId}`
  const slugBase = slugify(title) || `gravity-form-${gravityFormId}`
  const slug = `${slugBase}-${gravityFormId}`.replace(/-+/g, '-')
  const blockers: GravityImportIssue[] = []
  const warnings: GravityImportIssue[] = []
  const fields = Array.isArray(input.fields) ? input.fields : []

  if (!fields.length) {
    blockers.push({ code: 'missing_fields', message: 'Form has no fields to import.' })
  }

  const hasSaveSettings = !!input.save
  const hasNotifications = Array.isArray(input.notifications) && input.notifications.length > 0
  const hasConfirmations = Array.isArray(input.confirmations) && input.confirmations.length > 0

  const mappedFields: DashboardFormSchema['fields'] = []
  const mappedRules: Array<Record<string, unknown>> = []
  fields.forEach((field, idx) => {
    const type = safeString(field.type).toLowerCase()
    if (hasUnsupportedFieldType(type)) {
      blockers.push({
        code: 'unsupported_field_type',
        message: `Field ${field.id ?? idx} type "${type}" is not supported.`,
        path: `fields[${idx}].type`,
      })
      return
    }

    try {
      mappedFields.push(mapField(gravityFormId, field, idx))
      if (safeString(field.type).toLowerCase() === 'section') {
        mappedRules.push({
          type: 'gravitySection',
          fieldId: normalizeFieldId(gravityFormId, field.id ?? `section_${idx}`),
          title: safeString(field.label),
          description: safeString(field.description),
          gravity: field,
        })
      }
      const rule = mapConditionalRule(gravityFormId, field, idx)
      if (rule) {
        mappedRules.push(rule)
        warnings.push({
          code: 'conditional_logic_passthrough',
          message: `Field ${field.id ?? idx} conditional logic was preserved for Nuxt rendering.`,
          path: `fields[${idx}].conditionalLogic`,
        })
      }
    } catch (err: any) {
      blockers.push({
        code: 'field_mapping_error',
        message: err?.statusMessage || err?.message || `Failed to map field ${field.id ?? idx}`,
        path: `fields[${idx}]`,
      })
    }
  })

  const metadataRules: Array<Record<string, unknown>> = []
  if (hasSaveSettings) {
    metadataRules.push({
      type: 'gravityMetadata',
      key: 'save',
      value: input.save,
    })
    warnings.push({
      code: 'metadata_passthrough',
      message: 'Saved Gravity save/continue settings into schema rules metadata.',
      path: 'save',
    })
  }
  if (hasNotifications) {
    metadataRules.push({
      type: 'gravityMetadata',
      key: 'notifications',
      value: input.notifications,
    })
    warnings.push({
      code: 'metadata_passthrough',
      message: 'Saved Gravity notifications into schema rules metadata.',
      path: 'notifications',
    })
  }
  if (hasConfirmations) {
    metadataRules.push({
      type: 'gravityMetadata',
      key: 'confirmations',
      value: input.confirmations,
    })
    warnings.push({
      code: 'metadata_passthrough',
      message: 'Saved Gravity confirmations into schema rules metadata.',
      path: 'confirmations',
    })
  }

  const schema: DashboardFormSchema = {
    version: 1,
    title,
    description: safeString(input.description) || undefined,
    layout: { columns: 1 },
    fields: mappedFields,
    rules: [...mappedRules, ...metadataRules],
  }

  const validated = validateFormSchemaV1(schema)
  if (!validated.valid) {
    blockers.push(
      ...validated.errors.map((msg) => ({
        code: 'invalid_schema',
        message: msg,
        path: 'schema',
      })),
    )
  }

  const candidate: GravityImportCandidate | null = blockers.length
    ? null
    : {
        gravityFormId,
        slug,
        title,
        payload: {
          slug,
          title,
          componentKey: 'default',
          editableMode: 'immutable',
          status: 'inactive',
          indexedFields: mappedFields.map((field) => ({ key: field.id })),
          viewerGroups: [],
          schema,
        },
      }

  if (mappedFields.length && !blockers.length) {
    warnings.push({
      code: 'import_note',
      message:
        'Gravity metadata settings are preserved in schema.rules with type "gravityMetadata".',
    })
  }

  return {
    gravityFormId,
    title,
    slug,
    blockers,
    warnings,
    candidate,
  }
}

export function buildGravityImportReport(raw: unknown, mode: ImportMode): GravityImportReport {
  const parsed = parseGravityExport(raw)
  const forms = parsed.forms.map((form) => analyzeForm(form))
  const validForms = forms.filter((f) => !f.blockers.length).length
  return {
    mode,
    totals: {
      parsedForms: forms.length,
      validForms,
      blockedForms: forms.length - validForms,
    },
    forms,
  }
}

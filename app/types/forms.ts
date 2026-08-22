export type FormEditableMode = 'immutable' | 'versioned'
export type FormStatus = 'active' | 'inactive'
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'number'
  | 'file'
  | 'section'
  | 'repeater'
  | 'product'
  | 'total'
  | 'html'
  | 'hidden'

/** Fixed From address for form notification emails (SendGrid). */
export const FORM_NOTIFICATION_FROM = 'webdeveloper@asburyseminary.edu'

export type FormEmailNotification = {
  /** When true and `to` is set, notify on new submission. */
  enabled?: boolean
  /** One email or comma-separated list. */
  to?: string
  /** Always `FORM_NOTIFICATION_FROM` when saved. */
  from?: string
  /** Defaults to `New Entry: {form title}`. */
  subject?: string
}

export type FormFieldOptionV1 = {
  label: string
  value: string
}

export type FormRepeaterColumnV1 = {
  id: string
  label: string
}

export type FormFieldV1 = {
  id: string
  type: FormFieldType
  label: string
  description?: string
  required?: boolean
  options?: FormFieldOptionV1[]
  accept?: string[]
  /** Column definitions for `repeater` fields (text inputs per row). */
  columns?: FormRepeaterColumnV1[]
  /** Unit price for Gravity-style `product` fields. */
  unitPrice?: number
  /** When true, product quantity is fixed at 1. */
  disableQuantity?: boolean
  /** HTML markup for `html` fields. */
  content?: string
  /** Default / merge-tag value for `hidden` (and product name fallback). */
  defaultValue?: string
}

export type FormSchemaV1 = {
  version: number
  title?: string
  description?: string
  layout?: { columns?: number }
  fields: FormFieldV1[]
  rules?: unknown[]
  /** Persisted with schema JSON so no Payload collection field is required. */
  emailNotification?: FormEmailNotification
}

export type ConnectFormDefinition = {
  id: number | string
  slug: string
  title?: string
  status: FormStatus
  componentKey: string
  editableMode: FormEditableMode
  schema: FormSchemaV1
  indexedFields?: string[]
  viewerGroups?: unknown[]
  /** Optional top-level mirror if Payload adds the field later. */
  emailNotification?: FormEmailNotification
  updatedAt?: string
  createdAt?: string
}

export type FormSubmitPayload = {
  formSlug: string
  answers: Record<string, unknown>
  rootSubmissionId?: number
}

export type FormUploadPayload = {
  formSlug: string
  submissionId: string | number
  fieldKey: string
  file: File
}

export function defaultFormNotificationSubject(formTitleOrSlug: string): string {
  const name = String(formTitleOrSlug || '').trim() || 'Form'
  return `New Entry: ${name}`
}

export function normalizeFormEmailNotification(
  raw: unknown,
  fallbackTitle = '',
): FormEmailNotification {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const to = typeof src.to === 'string' ? src.to.trim() : ''
  const subjectRaw = typeof src.subject === 'string' ? src.subject.trim() : ''
  const enabled = src.enabled === true || (src.enabled !== false && to.length > 0)
  return {
    enabled,
    to,
    from: FORM_NOTIFICATION_FROM,
    subject: subjectRaw || defaultFormNotificationSubject(fallbackTitle),
  }
}

/** Split a to-field into unique, trimmed email addresses. */
export function parseNotificationRecipients(to: string | undefined | null): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of String(to || '').split(/[,;]+/)) {
    const email = part.trim().toLowerCase()
    if (!email || !email.includes('@') || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

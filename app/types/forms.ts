export type FormEditableMode = 'immutable' | 'versioned'
export type FormStatus = 'active' | 'inactive'
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'number'
  | 'file'

export type FormFieldOptionV1 = {
  label: string
  value: string
}

export type FormFieldV1 = {
  id: string
  type: FormFieldType
  label: string
  description?: string
  required?: boolean
  options?: FormFieldOptionV1[]
  accept?: string[]
}

export type FormSchemaV1 = {
  version: number
  title?: string
  description?: string
  layout?: { columns?: number }
  fields: FormFieldV1[]
  rules?: unknown[]
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

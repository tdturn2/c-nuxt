import { createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from './payloadAuth'

export const FORM_FIELD_TYPES = new Set([
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

export type FormFieldType = (typeof FORM_FIELD_TYPES extends Set<infer T> ? T : never) & string

export type DashboardFormField = {
  id: string
  type: FormFieldType
  label?: string
  description?: string
  required?: boolean
  accept?: string[]
  options?: Array<{ label?: string; value?: string }>
}

export type DashboardFormSchema = {
  version: number
  title?: string
  description?: string
  layout?: Record<string, unknown>
  fields: DashboardFormField[]
  rules?: unknown[]
}

export type DashboardFormsAuth = {
  email: string
  token: string | null
  payloadSessionCookie: string | null
  payloadBaseUrl: string
}

export function toProxyError(err: any, fallbackMessage: string) {
  const statusCode =
    err?.statusCode ??
    err?.response?.status ??
    err?.response?.statusCode ??
    err?.status ??
    500
  const data = err?.data ?? err?.response?._data ?? err?.response?.data
  const payloadErrorMessage =
    Array.isArray(data?.errors) && data.errors.length && typeof data.errors[0]?.message === 'string'
      ? data.errors[0].message
      : undefined
  const statusMessage = payloadErrorMessage ?? data?.message ?? err?.statusMessage ?? err?.message ?? fallbackMessage
  return createError({ statusCode, statusMessage, data })
}

function getPayloadBaseUrl() {
  const config = useRuntimeConfig()
  return (
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  )
}

async function isAdminTokenSession(payloadBaseUrl: string, token: string | null) {
  if (!token) return false
  try {
    await $fetch(`${payloadBaseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return true
  } catch {
    return false
  }
}

export async function requireDashboardStaff(event: any): Promise<DashboardFormsAuth> {
  const { token, email, payloadSessionCookie } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const payloadBaseUrl = getPayloadBaseUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  const canUseAdminToken = await isAdminTokenSession(payloadBaseUrl, token)
  const headers = getPayloadProxyHeaders(
    event,
    { token: canUseAdminToken ? token : null, payloadSessionCookie },
    { 'Content-Type': 'application/json' }
  )

  const connectUserRes: any = await $fetch(
    `${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}&limit=1&depth=0`,
    { headers }
  ).catch((err: any) => {
    throw toProxyError(err, 'Failed to load connect-user')
  })

  const connectUser = Array.isArray(connectUserRes?.docs) ? connectUserRes.docs[0] : null
  const roles = [
    ...(Array.isArray(connectUser?.roles) ? connectUser.roles : []),
    ...(Array.isArray(connectUser?.fields?.roles) ? connectUser.fields.roles : []),
  ]
    .map((role: unknown) => String(role || '').trim().toLowerCase())
    .filter(Boolean)

  if (!roles.includes('staff')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return {
    email,
    token: canUseAdminToken ? token : null,
    payloadSessionCookie,
    payloadBaseUrl,
  }
}

export function getDashboardPayloadHeaders(event: any, auth: DashboardFormsAuth, extra?: Record<string, string>) {
  return getPayloadProxyHeaders(
    event,
    {
      token: auth.token,
      payloadSessionCookie: auth.payloadSessionCookie,
    },
    extra
  )
}

export function withServerBearer(headers: Record<string, string>) {
  if (headers.Authorization) return headers
  const config = useRuntimeConfig()
  const raw = config.payloadServerBearer
  const bearer = typeof raw === 'string' ? raw.trim() : ''
  if (!bearer) return headers
  return {
    ...headers,
    Authorization: `Bearer ${bearer}`,
  }
}

export function normalizeDashboardFormSchema(schema: unknown): DashboardFormSchema {
  if (!schema || typeof schema !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'schema must be an object' })
  }
  const parsed = schema as Record<string, any>
  const rawFields = Array.isArray(parsed.fields) ? parsed.fields : []
  if (!rawFields.length) {
    throw createError({ statusCode: 400, statusMessage: 'schema.fields must contain at least one field' })
  }

  const seen = new Set<string>()
  const fields: DashboardFormField[] = rawFields.map((field, idx) => {
    const fieldObj = field && typeof field === 'object' ? field : {}
    const id = String(fieldObj.id ?? '').trim()
    if (!id) throw createError({ statusCode: 400, statusMessage: `schema.fields[${idx}].id is required` })
    if (seen.has(id)) throw createError({ statusCode: 400, statusMessage: `Duplicate field id: ${id}` })
    seen.add(id)

    const type = String(fieldObj.type ?? '').trim().toLowerCase()
    if (!FORM_FIELD_TYPES.has(type as FormFieldType)) {
      throw createError({ statusCode: 400, statusMessage: `Unsupported field type for ${id}: ${type}` })
    }

    const fieldOut: DashboardFormField = {
      id,
      type: type as FormFieldType,
      label: typeof fieldObj.label === 'string' ? fieldObj.label : undefined,
      description: typeof fieldObj.description === 'string' ? fieldObj.description : undefined,
      required: !!fieldObj.required,
    }

    if (type === 'file' && Array.isArray(fieldObj.accept)) {
      fieldOut.accept = fieldObj.accept.map((v: unknown) => String(v || '').trim()).filter(Boolean)
    }

    if ((type === 'select' || type === 'radio' || type === 'checkbox') && Array.isArray(fieldObj.options)) {
      fieldOut.options = fieldObj.options
        .map((opt: any) => ({
          label: typeof opt?.label === 'string' ? opt.label : '',
          value: typeof opt?.value === 'string' ? opt.value : '',
        }))
        .filter((opt: any) => opt.value)
    }

    return fieldOut
  })

  return {
    version: Number.isFinite(Number(parsed.version)) ? Number(parsed.version) : 1,
    title: typeof parsed.title === 'string' ? parsed.title : undefined,
    description: typeof parsed.description === 'string' ? parsed.description : undefined,
    layout: parsed.layout && typeof parsed.layout === 'object' ? parsed.layout : undefined,
    fields,
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
  }
}

export function normalizeFormMetadata(input: Record<string, any>) {
  const slug = String(input.slug ?? '').trim()
  const componentKey = String(input.componentKey ?? '').trim()
  const status = String(input.status ?? '').trim().toLowerCase()
  const editableMode = String(input.editableMode ?? '').trim().toLowerCase()

  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug is required' })
  if (!componentKey) throw createError({ statusCode: 400, statusMessage: 'componentKey is required' })
  if (status !== 'active' && status !== 'inactive') {
    throw createError({ statusCode: 400, statusMessage: 'status must be active or inactive' })
  }
  if (editableMode !== 'immutable' && editableMode !== 'versioned') {
    throw createError({ statusCode: 400, statusMessage: 'editableMode must be immutable or versioned' })
  }

  const indexedFields = Array.isArray(input.indexedFields)
    ? input.indexedFields
        .map((v: unknown) => {
          if (v && typeof v === 'object' && 'key' in (v as Record<string, unknown>)) {
            const key = String((v as Record<string, unknown>).key || '').trim()
            return key ? { key } : null
          }
          const key = String(v || '').trim()
          return key ? { key } : null
        })
        .filter((v): v is { key: string } => v != null)
    : []

  const viewerGroups = Array.isArray(input.viewerGroups) ? input.viewerGroups : []

  return {
    slug,
    title: typeof input.title === 'string' ? input.title.trim() : '',
    componentKey,
    status,
    editableMode,
    indexedFields,
    viewerGroups,
  }
}

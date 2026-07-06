import { createError, getHeader } from 'h3'
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

const isAdminGroupTag = (value: string): boolean => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return false
  return (
    normalized === 'admin' ||
    normalized.includes('admin ') ||
    normalized.includes(' admin') ||
    normalized.includes('connect-admin') ||
    normalized.includes('connect admin')
  )
}

function getPayloadBaseUrl() {
  const config = useRuntimeConfig()
  return (
    (config.payloadBaseUrl || config.public.payloadBaseUrl || '').trim() ||
    (import.meta.dev ? 'http://localhost:3002' : '')
  )
}

export async function requireDashboardStaff(
  event: any,
  options?: { adminOnly?: boolean },
): Promise<DashboardFormsAuth> {
  let { email } = await authenticateWithPayloadCMS(event)
  if (!email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const payloadBaseUrl = getPayloadBaseUrl()
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing PAYLOAD_BASE_URL' })
  }

  // Canonical dashboard auth path: mint a fresh connect-users auth on every
  // dashboard request using the resolved SSO email, then forward that auth.
  const rescue = await $fetch<any>(`${payloadBaseUrl}/api/connect-users/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email },
  })
    .then((data) => ({
      token: typeof data?.token === 'string' ? data.token : null,
      payloadSessionCookie: null as string | null,
    }))
    .catch(() => ({
      token: null,
      payloadSessionCookie: null as string | null,
    }))
  const token = rescue.token || null
  const payloadSessionCookie = rescue.payloadSessionCookie || null
  if (!token && !payloadSessionCookie) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Dashboard auth expired; please sign out and sign in again.',
      data: { requiresReauth: true },
    })
  }

  const headers = getPayloadProxyHeaders(
    event,
    { token, payloadSessionCookie },
    { 'Content-Type': 'application/json' }
  )

  const connectUserRes: any = await $fetch(
    `${payloadBaseUrl}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}&limit=1&depth=1`,
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

  const groups = Array.isArray(connectUser?.groups) ? connectUser.groups : []
  const groupObjectTags = groups
    .map((group: any) => {
      if (!group || typeof group !== 'object') return ''
      const slug = String(group.slug || '').trim().toLowerCase()
      const name = String(group.name || '').trim().toLowerCase()
      return `${slug} ${name}`.trim()
    })
    .filter(Boolean)

  // Relationship fields sometimes return raw IDs depending on depth/access,
  // so resolve IDs against connect-groups before enforcing permissions.
  const groupIds = groups
    .map((group: any) => {
      if (typeof group === 'number' && Number.isFinite(group)) return group
      if (typeof group === 'string' && /^\d+$/.test(group.trim())) return Number(group.trim())
      if (group && typeof group === 'object' && group.id != null) {
        const id = group.id
        if (typeof id === 'number' && Number.isFinite(id)) return id
        if (typeof id === 'string' && /^\d+$/.test(id.trim())) return Number(id.trim())
      }
      return null
    })
    .filter((id): id is number => id != null)

  let resolvedGroupTags: string[] = []
  if (groupIds.length) {
    const allGroupsRes: any = await $fetch(
      `${payloadBaseUrl}/api/connect-groups?limit=500&depth=0&pagination=false`,
      { headers },
    ).catch(() => null)
    const allGroups = Array.isArray(allGroupsRes?.docs) ? allGroupsRes.docs : []
    const byId = new Map<string, any>(allGroups.map((group: any) => [String(group?.id), group]))
    resolvedGroupTags = groupIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((group: any) => {
        const slug = String(group.slug || '').trim().toLowerCase()
        const name = String(group.name || '').trim().toLowerCase()
        return `${slug} ${name}`.trim()
      })
      .filter(Boolean)
  }

  const groupTags = [...groupObjectTags, ...resolvedGroupTags]
  const hasConnectAdminGroup = groupTags.some((value) => isAdminGroupTag(value))
  const hasAdminRole = roles.includes('admin')
  const hasDashboardRole = roles.includes('staff') || hasAdminRole

  if (options?.adminOnly) {
    if (!hasAdminRole && !hasConnectAdminGroup) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
  } else if (!hasDashboardRole && !hasConnectAdminGroup) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return {
    email,
    token,
    payloadSessionCookie,
    payloadBaseUrl,
  }
}

export async function requireDashboardAdmin(event: any): Promise<DashboardFormsAuth> {
  return requireDashboardStaff(event, { adminOnly: true })
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

export function withServerBearer(headers: Record<string, string>, _options?: { force?: boolean }) {
  return headers
}

function getServerBearerAuthorization(): string | null {
  const config = useRuntimeConfig()
  const raw = config.payloadServerBearer
  const bearer = typeof raw === 'string' ? raw.trim() : ''
  return bearer ? `Bearer ${bearer}` : null
}

export async function dashboardPayloadFetch<T = any>(
  url: string,
  init: {
    event: any
    auth: DashboardFormsAuth
    method?: string
    body?: any
    headers?: Record<string, string>
  },
): Promise<T> {
  const incomingAuth = String(getHeader(init.event, 'authorization') || '')
  const hasIncomingBearer = /^Bearer\s+\S+/i.test(incomingAuth)
  if (!init.auth.token && !init.auth.payloadSessionCookie) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Dashboard auth expired; please sign out and sign in again.',
      data: { requiresReauth: true },
    })
  }
  const baseHeaders = withServerBearer(
    getDashboardPayloadHeaders(init.event, init.auth, {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    }),
  )

  try {
    return await $fetch<T>(url, {
      method: init.method as any,
      headers: baseHeaders,
      body: init.body,
    })
  } catch (err: any) {
    const statusCode =
      err?.statusCode ??
      err?.response?.status ??
      err?.response?.statusCode ??
      err?.status
    if (statusCode !== 403) throw err

    // Local/session flows can occasionally resolve staff identity but miss a fresh
    // Payload auth token on the first request. Re-sync once before any bearer fallback.
    const refreshedAuth = await authenticateWithPayloadCMS(init.event).catch(() => null)
    const refreshedHeaders = refreshedAuth
      ? getPayloadProxyHeaders(
          init.event,
          {
            token: refreshedAuth.token,
            payloadSessionCookie: refreshedAuth.payloadSessionCookie,
          },
          {
            'Content-Type': 'application/json',
            ...(init.headers || {}),
          },
        )
      : null
    if (refreshedHeaders && (refreshedAuth?.token || refreshedAuth?.payloadSessionCookie)) {
      try {
        return await $fetch<T>(url, {
          method: init.method as any,
          headers: refreshedHeaders,
          body: init.body,
        })
      } catch (refreshErr: any) {
        const refreshStatus =
          refreshErr?.statusCode ??
          refreshErr?.response?.status ??
          refreshErr?.response?.statusCode ??
          refreshErr?.status
        if (refreshStatus !== 403) throw refreshErr
      }
    }

    const authHeader = getServerBearerAuthorization()
    if (!authHeader) {
      if (hasIncomingBearer) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Dashboard auth expired; please reauthenticate and retry.',
          data: {
            url,
            method: init.method || 'GET',
            firstAttemptStatus: statusCode,
            usedBearerFallback: false,
            requiresReauth: true,
          },
        })
      }
      throw createError({
        statusCode: 403,
        statusMessage: 'Dashboard upstream forbidden (no PAYLOAD_SERVER_BEARER fallback configured)',
        data: {
          url,
          method: init.method || 'GET',
          firstAttemptStatus: statusCode,
          usedBearerFallback: false,
        },
      })
    }

    const retryHeaders = {
      ...baseHeaders,
      Authorization: authHeader,
    }
    try {
      return await $fetch<T>(url, {
        method: init.method as any,
        headers: retryHeaders,
        body: init.body,
      })
    } catch (retryErr: any) {
      const retryStatus =
        retryErr?.statusCode ??
        retryErr?.response?.status ??
        retryErr?.response?.statusCode ??
        retryErr?.status
      throw createError({
        statusCode: retryStatus || 403,
        statusMessage: 'Dashboard upstream forbidden (user-context and bearer fallback both failed)',
        data: {
          url,
          method: init.method || 'GET',
          firstAttemptStatus: statusCode,
          secondAttemptStatus: retryStatus || null,
          usedBearerFallback: true,
        },
      })
    }
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

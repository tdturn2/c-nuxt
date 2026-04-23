import type { ConnectFormDefinition, FormSchemaV1, FormStatus } from '~/types/forms'
import { normalizeApiError } from '~/utils/forms/apiError'

type ListResponse = {
  docs?: ConnectFormDefinition[]
  totalDocs?: number
  page?: number
  totalPages?: number
}

type ListQuery = {
  page?: number
  limit?: number
  search?: string
  status?: FormStatus | ''
}

type SavePayload = {
  slug: string
  title?: string
  status: FormStatus
  componentKey: string
  editableMode: 'immutable' | 'versioned'
  schema: FormSchemaV1
  indexedFields?: string[]
  viewerGroups?: unknown[]
}

type GravityImportResponse = {
  mode: 'dryRun' | 'commit'
  totals: {
    parsedForms: number
    validForms: number
    blockedForms: number
  }
  forms: Array<{
    gravityFormId: string
    title: string
    slug: string
    blockers: Array<{ code: string; message: string; path?: string }>
    warnings: Array<{ code: string; message: string; path?: string }>
    candidate: null | { gravityFormId: string; slug: string; title: string }
  }>
  created?: Array<{ gravityFormId: string; id: string | number; slug: string }>
}

export function useDashboardForms() {
  async function listForms(query: ListQuery = {}) {
    try {
      return await $fetch<ListResponse>('/api/dashboard/forms', { query })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to load forms.')
    }
  }

  async function getFormById(id: string | number) {
    try {
      const res = await $fetch<any>(`/api/dashboard/forms/${encodeURIComponent(String(id))}`)
      return (res?.doc ?? res) as ConnectFormDefinition
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to load form.')
    }
  }

  async function createForm(payload: SavePayload) {
    try {
      return await $fetch<ConnectFormDefinition>('/api/dashboard/forms', {
        method: 'POST',
        body: payload,
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to create form.')
    }
  }

  async function updateForm(id: string | number, payload: SavePayload) {
    try {
      return await $fetch<ConnectFormDefinition>(`/api/dashboard/forms/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        body: payload,
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to update form.')
    }
  }

  async function setFormStatus(id: string | number, status: FormStatus) {
    try {
      return await $fetch<ConnectFormDefinition>(`/api/dashboard/forms/${encodeURIComponent(String(id))}/status`, {
        method: 'PATCH',
        body: { status },
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to update form status.')
    }
  }

  async function importGravityJson(file: File, mode: 'dryRun' | 'commit' = 'dryRun') {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', mode)
      return await $fetch<GravityImportResponse>('/api/dashboard/forms/import', {
        method: 'POST',
        body: formData,
      })
    } catch (error: any) {
      throw normalizeApiError(error, mode === 'commit' ? 'Failed to import forms.' : 'Failed to analyze import.')
    }
  }

  return {
    listForms,
    getFormById,
    createForm,
    updateForm,
    setFormStatus,
    importGravityJson,
  }
}

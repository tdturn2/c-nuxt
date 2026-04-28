import { normalizeApiError } from '~/utils/forms/apiError'

export type DashboardSliderItem = {
  id: number | string
  title: string
  href: string
  openInNewTab?: boolean
  active?: boolean
  sortOrder?: number
  startAt?: string | null
  endAt?: string | null
  image?: any
  updatedAt?: string
}

export type DashboardChapelSpeaker = {
  id: number | string
  name: string
  speakerDescription?: string | null
  photo?: any
  active?: boolean
  updatedAt?: string
}

export function useDashboardContent() {
  async function listSliderItems() {
    try {
      return await $fetch<any>('/api/dashboard/home-slider')
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to load slider items.')
    }
  }

  async function createSliderItem(payload: Record<string, any>) {
    try {
      return await $fetch<any>('/api/dashboard/home-slider', {
        method: 'POST',
        body: payload,
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to create slider item.')
    }
  }

  async function updateSliderItem(id: string | number, payload: Record<string, any>) {
    try {
      return await $fetch<any>(`/api/dashboard/home-slider/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        body: payload,
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to update slider item.')
    }
  }

  async function deleteSliderItem(id: string | number) {
    try {
      return await $fetch<any>(`/api/dashboard/home-slider/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to delete slider item.')
    }
  }

  async function listChapelSpeakers() {
    try {
      return await $fetch<any>('/api/dashboard/chapel-speakers')
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to load chapel speakers.')
    }
  }

  async function createChapelSpeaker(payload: Record<string, any>) {
    try {
      return await $fetch<any>('/api/dashboard/chapel-speakers', {
        method: 'POST',
        body: payload,
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to create chapel speaker.')
    }
  }

  async function updateChapelSpeaker(id: string | number, payload: Record<string, any>) {
    try {
      return await $fetch<any>(`/api/dashboard/chapel-speakers/${encodeURIComponent(String(id))}`, {
        method: 'PATCH',
        body: payload,
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to update chapel speaker.')
    }
  }

  async function deleteChapelSpeaker(id: string | number) {
    try {
      return await $fetch<any>(`/api/dashboard/chapel-speakers/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      })
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to delete chapel speaker.')
    }
  }

  return {
    listSliderItems,
    createSliderItem,
    updateSliderItem,
    deleteSliderItem,
    listChapelSpeakers,
    createChapelSpeaker,
    updateChapelSpeaker,
    deleteChapelSpeaker,
  }
}

import type { ClassPlannerItem } from '@shared/classPlannerItem'

export type { ClassPlannerItem } from '@shared/classPlannerItem'

const plannerItems = ref<ClassPlannerItem[]>([])
const plannerPending = ref(false)
const plannerError = ref<string | null>(null)
const plannerLoaded = ref(false)

/** Section keys with an in-flight save — bookmark shows saved until POST finishes (then real row takes over). */
const pendingPlannerSaveKeys = ref<string[]>([])

function sectionKeyNorm(s: string) {
  return String(s || '').trim().toUpperCase()
}

function markPendingPlannerSave(sectionKey: string) {
  const k = sectionKeyNorm(sectionKey)
  if (pendingPlannerSaveKeys.value.includes(k)) return
  pendingPlannerSaveKeys.value = [...pendingPlannerSaveKeys.value, k]
}

function clearPendingPlannerSave(sectionKey: string) {
  const k = sectionKeyNorm(sectionKey)
  pendingPlannerSaveKeys.value = pendingPlannerSaveKeys.value.filter((x) => x !== k)
}

function upsertPlannerItem(item: ClassPlannerItem) {
  const list = [...plannerItems.value]
  const sk = sectionKeyNorm(item.sectionKey)
  const idx = list.findIndex((i) => i.id === item.id || sectionKeyNorm(i.sectionKey) === sk)
  if (idx >= 0) list[idx] = item
  else list.push(item)
  plannerItems.value = list
  plannerLoaded.value = true
}

export const useClassPlanner = () => {
  async function refreshPlanner(opts?: { silent?: boolean }) {
    const silent = opts?.silent === true
    if (!silent) {
      plannerPending.value = true
      plannerError.value = null
    }
    try {
      const response = await $fetch<{ items: ClassPlannerItem[] }>('/api/class-planner', {
        credentials: 'include',
      })
      plannerItems.value = Array.isArray(response?.items) ? response.items : []
      plannerLoaded.value = true
    } catch (e: any) {
      if (!silent) {
        plannerError.value = e?.data?.message || e?.statusMessage || 'Failed to load class planner'
      }
    } finally {
      if (!silent) plannerPending.value = false
    }
  }

  async function saveCourse(sectionKey: string, studentNote = '', termCode?: string | null) {
    markPendingPlannerSave(sectionKey)
    try {
      const { item } = await $fetch<{ item: ClassPlannerItem }>('/api/class-planner', {
        method: 'POST',
        credentials: 'include',
        body: {
          sectionKey,
          studentNote,
          ...(termCode ? { termCode: String(termCode).trim().toUpperCase() } : {}),
        },
      })
      upsertPlannerItem(item)
      void refreshPlanner({ silent: true })
    } catch (e) {
      clearPendingPlannerSave(sectionKey)
      throw e
    } finally {
      clearPendingPlannerSave(sectionKey)
    }
  }

  async function updateNote(id: number, studentNote: string) {
    await $fetch(`/api/class-planner/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { studentNote },
    })
    const idx = plannerItems.value.findIndex((i) => i.id === id)
    const row = idx >= 0 ? plannerItems.value[idx] : undefined
    if (row) {
      const updated: ClassPlannerItem = {
        ...row,
        studentNote,
        updatedAt: new Date().toISOString(),
      }
      plannerItems.value[idx] = updated
    }
  }

  async function removeItem(id: number) {
    const prev = plannerItems.value
    plannerItems.value = prev.filter((item) => item.id !== id)
    try {
      await $fetch(`/api/class-planner/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      void refreshPlanner({ silent: true })
    } catch (e) {
      plannerItems.value = prev
      throw e
    }
  }

  return {
    plannerItems,
    plannerPending,
    plannerError,
    plannerLoaded,
    pendingPlannerSaveKeys,
    refreshPlanner,
    saveCourse,
    updateNote,
    removeItem,
  }
}

export type ClassPlannerItem = {
  id: number
  sectionKey: string
  termCode: string | null
  termLabel: string
  courseCode: string
  courseTitle: string
  section: string
  credits: number | null
  instructor: string
  deliveryMethod: string
  location: string
  statusAtSave: string
  studentNote: string
  updatedAt: string | null
}

const plannerItems = ref<ClassPlannerItem[]>([])
const plannerPending = ref(false)
const plannerError = ref<string | null>(null)
const plannerLoaded = ref(false)

export const useClassPlanner = () => {
  async function refreshPlanner() {
    plannerPending.value = true
    plannerError.value = null
    try {
      const response = await $fetch<{ items: ClassPlannerItem[] }>('/api/class-planner', {
        credentials: 'include',
      })
      plannerItems.value = Array.isArray(response?.items) ? response.items : []
      plannerLoaded.value = true
    } catch (e: any) {
      plannerError.value = e?.data?.message || e?.statusMessage || 'Failed to load class planner'
    } finally {
      plannerPending.value = false
    }
  }

  async function saveCourse(sectionKey: string, studentNote = '') {
    await $fetch('/api/class-planner', {
      method: 'POST',
      credentials: 'include',
      body: { sectionKey, studentNote },
    })
    await refreshPlanner()
  }

  async function updateNote(id: number, studentNote: string) {
    await $fetch(`/api/class-planner/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { studentNote },
    })
    const idx = plannerItems.value.findIndex((i) => i.id === id)
    if (idx >= 0) {
      plannerItems.value[idx] = { ...plannerItems.value[idx], studentNote, updatedAt: new Date().toISOString() }
    }
  }

  async function removeItem(id: number) {
    await $fetch(`/api/class-planner/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    plannerItems.value = plannerItems.value.filter((item) => item.id !== id)
  }

  return {
    plannerItems,
    plannerPending,
    plannerError,
    plannerLoaded,
    refreshPlanner,
    saveCourse,
    updateNote,
    removeItem,
  }
}

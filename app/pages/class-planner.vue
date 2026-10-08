<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Class Planner</h1>
            <p class="mt-1 text-sm text-gray-600">Saved sections and planning notes across terms.</p>
          </div>
          <NuxtLink to="/class-search" class="text-sm font-medium text-[rgba(13,94,130,1)] hover:underline">
            Class Search
          </NuxtLink>
        </div>

        <p class="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Save notes here for registration planning, then officially register in the
          <a href="https://portal.asburyseminary.edu" target="_blank" rel="noopener noreferrer" class="font-medium underline hover:no-underline">Portal</a>.
        </p>

        <div v-if="plannerPending" class="py-8 text-sm text-gray-500">Loading planner...</div>
        <div v-else-if="plannerError" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {{ plannerError }}
        </div>
        <div v-else-if="!plannerItems.length" class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No classes saved yet. Save courses from Class Search to build your plan.
        </div>
        <div v-else class="space-y-6">
          <section v-for="group in plannerGroups" :key="group.termKey" class="space-y-2">
            <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ group.termLabel }}</h2>
            <ClassPlannerCard
              v-for="item in group.items"
              :key="item.id"
              :item="item"
              @remove="removePlannerItem"
              @update-note="onNoteInput"
            />
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { ClassPlannerItem } from '~/composables/useClassPlanner'

const { plannerItems, plannerPending, plannerError, plannerLoaded, refreshPlanner, removeItem, updateNote } = useClassPlanner()

const plannerGroups = computed(() => {
  const groups = new Map<string, { termKey: string; termLabel: string; items: ClassPlannerItem[] }>()
  for (const item of plannerItems.value) {
    const termKey = item.termCode || 'unknown'
    const termLabel = item.termLabel || 'Unknown term'
    if (!groups.has(termKey)) groups.set(termKey, { termKey, termLabel, items: [] })
    groups.get(termKey)!.items.push(item)
  }
  return Array.from(groups.values())
})

const noteTimers = new Map<number, ReturnType<typeof setTimeout>>()

function onNoteInput(id: number, note: string) {
  const active = noteTimers.get(id)
  if (active) clearTimeout(active)
  noteTimers.set(id, setTimeout(() => {
    updateNote(id, note)
    noteTimers.delete(id)
  }, 500))
}

async function removePlannerItem(id: number) {
  await removeItem(id)
}

onMounted(async () => {
  if (!plannerLoaded.value) await refreshPlanner()
})
</script>

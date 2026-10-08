<template>
  <USlideover v-model:open="open" :ui="{ content: 'max-w-2xl w-full', body: 'overflow-y-auto' }">
    <template #header>
      <div class="flex items-center justify-between gap-3 w-full">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Class Planner</p>
          <h2 class="text-base font-semibold text-gray-900">Saved Classes</h2>
        </div>
        <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
          {{ items.length }}
        </span>
      </div>
    </template>

    <template #body>
      <p class="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        Save notes here for registration planning, then officially register in the
        <a href="https://portal.asburyseminary.edu" target="_blank" rel="noopener noreferrer" class="font-medium underline hover:no-underline">Portal</a>.
      </p>
      <div v-if="pending" class="py-8 text-center text-gray-500 text-sm">Loading planner...</div>
      <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {{ error }}
      </div>
      <div v-else-if="items.length === 0" class="py-8 text-center text-gray-500 text-sm">
        No classes saved yet. Save courses from Class Search to build your plan.
      </div>
      <div v-else class="space-y-5 pb-4">
        <section v-for="group in groupedItems" :key="group.termKey" class="space-y-2">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ group.termLabel }}</h3>
          <ClassPlannerCard
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            @remove="$emit('remove', $event)"
            @update-note="onNoteInput"
          />
        </section>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { ClassPlannerItem } from '~/composables/useClassPlanner'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  items: ClassPlannerItem[]
  pending?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  remove: [id: number]
  updateNote: [id: number, note: string]
}>()

const groupedItems = computed(() => {
  const groups = new Map<string, { termKey: string; termLabel: string; items: ClassPlannerItem[] }>()
  for (const item of props.items) {
    const termKey = item.termCode || 'unknown'
    const termLabel = item.termLabel || 'Unknown term'
    if (!groups.has(termKey)) {
      groups.set(termKey, { termKey, termLabel, items: [] })
    }
    groups.get(termKey)!.items.push(item)
  }
  return Array.from(groups.values())
})

const noteTimers = new Map<number, ReturnType<typeof setTimeout>>()

function onNoteInput(id: number, note: string) {
  const active = noteTimers.get(id)
  if (active) clearTimeout(active)
  noteTimers.set(
    id,
    setTimeout(() => {
      emit('updateNote', id, note)
      noteTimers.delete(id)
    }, 500),
  )
}
</script>

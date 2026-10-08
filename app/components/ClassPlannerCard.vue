<template>
  <article class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <div class="flex items-start gap-3 p-4">
      <component
        :is="profileTo ? 'NuxtLink' : 'div'"
        v-if="faculty"
        :to="profileTo || undefined"
        class="mt-0.5 shrink-0"
        :class="profileTo ? 'rounded-full ring-2 ring-[var(--color-gold)] ring-offset-2 hover:opacity-90' : ''"
      >
        <img
          v-if="faculty?.avatarUrl"
          :src="faculty.avatarUrl"
          :alt="faculty.name"
          class="h-12 w-12 rounded-full object-cover"
        >
        <span
          v-else-if="faculty"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(13,94,130,0.1)] text-sm font-semibold text-[rgba(10,69,92,1)]"
        >
          {{ initials }}
        </span>
      </component>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-[rgba(13,94,130,1)]">
              {{ item.courseCode || item.sectionKey }}
              <span v-if="item.section"> · {{ item.section }}</span>
            </p>
            <h3 class="mt-0.5 text-base font-semibold leading-snug text-gray-900">
              {{ item.courseTitle || item.sectionKey }}
            </h3>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            @click="$emit('remove', item.id)"
          >
            Remove
          </button>
        </div>

        <p class="mt-2 text-sm text-gray-700">
          <NuxtLink
            v-if="faculty?.username"
            :to="`/user/${faculty.username}`"
            class="font-medium text-[rgba(13,94,130,1)] hover:underline"
          >
            {{ displayName }}
          </NuxtLink>
          <FacultyHoverCard
            v-else-if="faculty"
            :faculty="faculty"
            :display-name="displayName"
          />
          <span v-else>{{ displayName }}</span>
          <span v-if="faculty?.employeeTitle" class="text-gray-500"> · {{ faculty.employeeTitle }}</span>
        </p>

        <div v-if="meta.length" class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="label in meta"
            :key="label"
            class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
          >
            {{ label }}
          </span>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-100 bg-gray-50/70 px-4 py-3">
      <label class="mb-1 block text-xs font-medium text-gray-600" :for="`note-${item.id}`">My notes</label>
      <textarea
        :id="`note-${item.id}`"
        :value="item.studentNote"
        rows="2"
        class="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
        placeholder="Add your thoughts for registration..."
        @input="$emit('updateNote', item.id, ($event.target as HTMLTextAreaElement).value)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ClassPlannerItem } from '~/composables/useClassPlanner'

const props = defineProps<{
  item: ClassPlannerItem
}>()

defineEmits<{
  remove: [id: number]
  updateNote: [id: number, note: string]
}>()

const { lookupFaculty, formatInstructor } = useFacultyNameMap()

const faculty = computed(() => lookupFaculty(props.item.instructor))
const displayName = computed(() => {
  const raw = props.item.instructor?.trim()
  if (!raw) return 'Instructor TBD'
  return faculty.value?.name || formatInstructor(raw)
})
const profileTo = computed(() => (faculty.value?.username ? `/user/${faculty.value.username}` : ''))
const initials = computed(() => {
  const parts = (faculty.value?.name || displayName.value).split(/\s+/).filter(Boolean)
  return parts.map((part) => part[0]).join('').toUpperCase().slice(0, 2)
})
const meta = computed(() => {
  const labels: string[] = []
  if (props.item.credits != null) labels.push(`${props.item.credits} cr`)
  if (props.item.location) labels.push(props.item.location)
  if (props.item.deliveryMethod) labels.push(props.item.deliveryMethod)
  return labels
})
</script>

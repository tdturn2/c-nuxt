<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Chapel Calendar Themes</h1>
            <p class="mt-1 text-sm text-gray-600">
              Highlight a day or a run of days on the chapel calendar, such as Kingdom Conference, Oct 13–15.
            </p>
          </div>
          <button
            v-if="canManageDashboard"
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
            @click="openCreate"
          >
            Add theme
          </button>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          You do not have access to this dashboard section.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>
          <div v-if="success" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{{ success }}</div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Theme</th>
                  <th class="px-4 py-2 text-left font-semibold">Dates</th>
                  <th class="px-4 py-2 text-left font-semibold">Color</th>
                  <th class="px-4 py-2 text-left font-semibold">Status</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="5" class="px-4 py-4 text-gray-500">Loading themes...</td>
                </tr>
                <tr v-else-if="!themes.length" class="border-t border-gray-200">
                  <td colspan="5" class="px-4 py-4 text-gray-500">No calendar themes yet.</td>
                </tr>
                <tr v-for="theme in themes" :key="theme.id" class="border-t border-gray-200 align-top">
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">{{ theme.label }}</div>
                    <div v-if="theme.note" class="mt-0.5 max-w-md text-gray-600">{{ theme.note }}</div>
                  </td>
                  <td class="px-4 py-3 text-gray-700">{{ formatThemeRange(theme.startDate, theme.endDate) }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      :style="{ backgroundColor: themeSwatch(theme.color), color: themeInk(theme.color) }"
                    >
                      {{ colorLabel(theme.color) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="theme.active ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'"
                    >
                      {{ theme.active ? 'On calendar' : 'Hidden' }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="openEdit(theme)">
                      Edit
                    </button>
                    <button type="button" class="ml-3 text-red-700 hover:underline" @click="removeTheme(theme.id)">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </main>

    <UModal v-model:open="modalOpen" :ui="{ content: 'max-w-xl', body: 'overflow-y-auto max-h-[85vh]' }">
      <template #body>
        <h2 class="text-lg font-semibold text-gray-900">{{ editingId ? 'Edit theme' : 'Add theme' }}</h2>
        <form class="mt-4 space-y-4" @submit.prevent="saveTheme">
          <label class="inline-flex items-center gap-2 text-sm text-gray-800">
            <input v-model="form.active" type="checkbox" class="rounded border-gray-300">
            Show on the chapel calendar
          </label>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              v-model="form.label"
              type="text"
              required
              maxlength="80"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Kingdom Conference"
            >
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Start date</label>
              <input v-model="form.startDate" type="date" required class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">End date</label>
              <input v-model="form.endDate" type="date" required class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
          </div>
          <div>
            <p class="mb-1 text-sm font-medium text-gray-700">Color</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in colorOptions"
                :key="option.key"
                type="button"
                class="rounded-full px-3 py-1 text-xs font-semibold ring-offset-2"
                :class="form.color === option.key ? 'ring-2 ring-[rgba(13,94,130,0.7)]' : ''"
                :style="{ backgroundColor: option.swatch, color: option.ink }"
                @click="form.color = option.key"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Note (optional)</label>
            <textarea
              v-model="form.note"
              rows="3"
              maxlength="400"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Shown when someone selects a day in this range."
            />
          </div>
          <div class="flex items-center gap-2 pt-1">
            <button
              type="submit"
              class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? 'Saving...' : editingId ? 'Update theme' : 'Create theme' }}
            </button>
            <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="modalOpen = false">
              Cancel
            </button>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import {
  CHAPEL_CALENDAR_THEME_COLORS,
  formatThemeRange,
  normalizeChapelCalendarThemeColor,
  themeInk,
  themeSwatch,
  type ChapelCalendarTheme,
  type ChapelCalendarThemeColor,
} from '@shared/chapelCalendarThemes'

const { mePending, canAccessSection } = useDashboardAccess()
const canManageDashboard = computed(() => canAccessSection('chapel'))

const themes = ref<ChapelCalendarTheme[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const modalOpen = ref(false)
const editingId = ref<number | null>(null)

const colorOptions = (Object.entries(CHAPEL_CALENDAR_THEME_COLORS) as Array<
  [ChapelCalendarThemeColor, (typeof CHAPEL_CALENDAR_THEME_COLORS)[ChapelCalendarThemeColor]]
>).map(([key, value]) => ({ key, label: value.label, swatch: value.swatch, ink: value.ink }))

const form = ref({
  active: true,
  label: '',
  startDate: '',
  endDate: '',
  color: 'gold' as ChapelCalendarThemeColor,
  note: '',
})

function colorLabel(color: ChapelCalendarThemeColor) {
  return CHAPEL_CALENDAR_THEME_COLORS[color].label
}

function normalizeTheme(doc: Partial<ChapelCalendarTheme> & { id?: number }): ChapelCalendarTheme {
  return {
    id: Number(doc.id),
    label: String(doc.label || ''),
    startDate: String(doc.startDate || '').slice(0, 10),
    endDate: String(doc.endDate || '').slice(0, 10),
    color: normalizeChapelCalendarThemeColor(doc.color),
    note: doc.note ? String(doc.note) : null,
    active: doc.active !== false,
  }
}

async function loadThemes() {
  if (!canManageDashboard.value) return
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{ docs?: Partial<ChapelCalendarTheme>[] }>('/api/dashboard/chapel-calendar-themes')
    themes.value = (Array.isArray(res?.docs) ? res.docs : []).map(normalizeTheme)
  } catch (e: any) {
    error.value = e?.statusMessage || e?.data?.message || e?.message || 'Failed to load themes.'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  form.value = {
    active: true,
    label: '',
    startDate: '',
    endDate: '',
    color: 'gold',
    note: '',
  }
}

function openCreate() {
  resetForm()
  modalOpen.value = true
}

function openEdit(theme: ChapelCalendarTheme) {
  editingId.value = theme.id
  form.value = {
    active: theme.active,
    label: theme.label,
    startDate: theme.startDate,
    endDate: theme.endDate,
    color: theme.color,
    note: theme.note || '',
  }
  modalOpen.value = true
}

async function saveTheme() {
  if (form.value.endDate < form.value.startDate) {
    error.value = 'End date must be on or after the start date.'
    return
  }
  saving.value = true
  error.value = null
  success.value = null
  const body = {
    active: form.value.active,
    label: form.value.label.trim(),
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    color: form.value.color,
    note: form.value.note.trim() || null,
  }
  try {
    if (editingId.value != null) {
      await $fetch(`/api/dashboard/chapel-calendar-themes/${editingId.value}`, { method: 'PATCH', body })
      success.value = 'Theme updated.'
    } else {
      await $fetch('/api/dashboard/chapel-calendar-themes', { method: 'POST', body })
      success.value = 'Theme created.'
    }
    modalOpen.value = false
    await loadThemes()
  } catch (e: any) {
    error.value = e?.statusMessage || e?.data?.errors?.[0]?.message || e?.data?.message || e?.message || 'Failed to save theme.'
  } finally {
    saving.value = false
  }
}

async function removeTheme(id: number) {
  if (!confirm('Delete this calendar theme?')) return
  error.value = null
  success.value = null
  try {
    await $fetch(`/api/dashboard/chapel-calendar-themes/${id}`, { method: 'DELETE' })
    success.value = 'Theme deleted.'
    await loadThemes()
  } catch (e: any) {
    error.value = e?.statusMessage || e?.data?.message || e?.message || 'Failed to delete theme.'
  }
}

watch(canManageDashboard, (ok) => {
  if (ok) void loadThemes()
}, { immediate: true })
</script>

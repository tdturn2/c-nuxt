<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Toast Manager</h1>
            <p class="mt-1 text-sm text-gray-600">
              Schedule in-app toast messages. Times use Eastern Time (America/New_York). Defaults announce chapel Tue–Thu at 10:45 and 10:55.
            </p>
          </div>
          <button
            v-if="canManageAdmin"
            type="button"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
            @click="openCreate"
          >
            Add toast
          </button>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          You do not have access to this dashboard section.
        </div>
        <div
          v-else-if="!canManageAdmin"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Toast management is limited to Connect admins.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>
          <div v-if="success" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{{ success }}</div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Enabled</th>
                  <th class="px-4 py-2 text-left font-semibold">Time (ET)</th>
                  <th class="px-4 py-2 text-left font-semibold">Days</th>
                  <th class="px-4 py-2 text-left font-semibold">Message</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="5" class="px-4 py-4 text-gray-500">Loading toasts...</td>
                </tr>
                <tr v-else-if="!toasts.length" class="border-t border-gray-200">
                  <td colspan="5" class="px-4 py-4 text-gray-500">No toasts yet.</td>
                </tr>
                <tr v-for="toast in toasts" :key="toast.id" class="border-t border-gray-200 align-top">
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      :class="toast.enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'"
                    >
                      {{ toast.enabled ? 'On' : 'Off' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-medium text-gray-900 tabular-nums">{{ toast.sendTime }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ formatDays(toast.daysOfWeek) }}</td>
                  <td class="px-4 py-3 text-gray-800">
                    <div v-if="toast.title" class="font-medium text-gray-900">{{ toast.title }}</div>
                    <div>{{ toast.message }}</div>
                    <a
                      v-if="toast.href"
                      :href="toast.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="mt-1 inline-block text-xs text-[rgba(13,94,130,1)] hover:underline"
                    >
                      {{ toast.hrefLabel || toast.href }}
                    </a>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" class="text-[rgba(13,94,130,1)] hover:underline" @click="previewToast(toast)">
                      Preview
                    </button>
                    <button type="button" class="ml-3 text-[rgba(13,94,130,1)] hover:underline" @click="openEdit(toast)">
                      Edit
                    </button>
                    <button type="button" class="ml-3 text-red-700 hover:underline" @click="removeToast(toast.id)">
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
        <h2 class="text-lg font-semibold text-gray-900">{{ editingId ? 'Edit toast' : 'Add toast' }}</h2>
        <form class="mt-4 space-y-4" @submit.prevent="saveToast">
          <label class="inline-flex items-center gap-2 text-sm text-gray-800">
            <input v-model="form.enabled" type="checkbox" class="rounded border-gray-300">
            Enabled
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Send time (ET)</label>
              <input v-model="form.sendTime" type="time" required class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Sort order</label>
              <input v-model.number="form.sortOrder" type="number" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
          </div>
          <div>
            <p class="mb-1 text-sm font-medium text-gray-700">Days</p>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="day in TOAST_DAY_OPTIONS"
                :key="day.value"
                class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm"
              >
                <input v-model="form.daysOfWeek" type="checkbox" :value="day.value">
                {{ day.label }}
              </label>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Title (optional)</label>
            <input v-model="form.title" type="text" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Chapel">
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">Message</label>
            <textarea v-model="form.message" rows="3" required class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Link URL (optional)</label>
              <input v-model="form.href" type="url" placeholder="https://asbury.to/live" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">Link label</label>
              <input v-model="form.hrefLabel" type="text" placeholder="Watch online" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <button
              type="submit"
              class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? 'Saving...' : editingId ? 'Update toast' : 'Create toast' }}
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
  TOAST_DAY_OPTIONS,
  type ConnectToast,
} from '@shared/connectToasts'

const { mePending, isAdmin, canAccessSection } = useDashboardAccess()
const canManageDashboard = computed(() => canAccessSection('toasts'))
const canManageAdmin = isAdmin
const uiToast = useToast()

const toasts = ref<ConnectToast[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const modalOpen = ref(false)
const editingId = ref<number | null>(null)

const form = ref({
  enabled: true,
  title: '',
  message: '',
  href: '',
  hrefLabel: '',
  daysOfWeek: [2, 3, 4] as number[],
  sendTime: '10:45',
  sortOrder: 0,
})

function formatDays(days: number[]): string {
  const labels = TOAST_DAY_OPTIONS.filter((d) => days.includes(d.value)).map((d) => d.label)
  return labels.length ? labels.join(', ') : '—'
}

function normalizeToast(doc: any): ConnectToast {
  return {
    id: Number(doc.id),
    title: doc.title ?? null,
    message: String(doc.message || ''),
    href: doc.href ?? null,
    hrefLabel: doc.hrefLabel ?? null,
    daysOfWeek: Array.isArray(doc.daysOfWeek) ? doc.daysOfWeek.map(Number) : [],
    sendTime: String(doc.sendTime || ''),
    timezone: String(doc.timezone || 'America/New_York'),
    enabled: doc.enabled !== false,
    sortOrder: doc.sortOrder == null ? null : Number(doc.sortOrder),
  }
}

async function loadToasts() {
  if (!canManageAdmin.value) return
  loading.value = true
  error.value = null
  try {
    const res: any = await $fetch('/api/dashboard/toasts')
    toasts.value = (Array.isArray(res?.docs) ? res.docs : []).map(normalizeToast)
  } catch (e: any) {
    error.value = e?.message || 'Failed to load toasts.'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  form.value = {
    enabled: true,
    title: '',
    message: '',
    href: '',
    hrefLabel: '',
    daysOfWeek: [2, 3, 4],
    sendTime: '10:45',
    sortOrder: toasts.value.length + 1,
  }
}

function openCreate() {
  resetForm()
  modalOpen.value = true
}

function openEdit(toast: ConnectToast) {
  editingId.value = toast.id
  form.value = {
    enabled: toast.enabled,
    title: toast.title || '',
    message: toast.message,
    href: toast.href || '',
    hrefLabel: toast.hrefLabel || '',
    daysOfWeek: [...toast.daysOfWeek],
    sendTime: toast.sendTime,
    sortOrder: toast.sortOrder ?? 0,
  }
  modalOpen.value = true
}

function previewToast(toast: ConnectToast) {
  uiToast.add({
    title: toast.title || 'Announcement',
    description: toast.message,
    icon: 'i-lucide-church',
    color: 'primary',
    duration: 12000,
    actions: toast.href
      ? [{
          label: toast.hrefLabel || 'Open',
          color: 'neutral',
          variant: 'outline',
          onClick: () => {
            window.open(toast.href!, '_blank', 'noopener,noreferrer')
          },
        }]
      : undefined,
  })
}

async function saveToast() {
  if (!form.value.daysOfWeek.length) {
    error.value = 'Select at least one day.'
    return
  }
  saving.value = true
  error.value = null
  success.value = null
  const body = {
    enabled: form.value.enabled,
    title: form.value.title.trim() || null,
    message: form.value.message.trim(),
    href: form.value.href.trim() || null,
    hrefLabel: form.value.hrefLabel.trim() || null,
    daysOfWeek: form.value.daysOfWeek.map((d) => Number(d)).filter((d) => Number.isInteger(d)),
    sendTime: form.value.sendTime,
    timezone: 'America/New_York',
    sortOrder: form.value.sortOrder,
  }
  try {
    if (editingId.value != null) {
      await $fetch(`/api/dashboard/toasts/${editingId.value}`, { method: 'PATCH', body })
      success.value = 'Toast updated.'
    } else {
      await $fetch('/api/dashboard/toasts', { method: 'POST', body })
      success.value = 'Toast created.'
    }
    modalOpen.value = false
    await loadToasts()
  } catch (e: any) {
    error.value = e?.message || 'Failed to save toast.'
  } finally {
    saving.value = false
  }
}

async function removeToast(id: number) {
  if (!confirm('Delete this toast schedule?')) return
  error.value = null
  success.value = null
  try {
    await $fetch(`/api/dashboard/toasts/${id}`, { method: 'DELETE' })
    success.value = 'Toast deleted.'
    await loadToasts()
  } catch (e: any) {
    error.value = e?.message || 'Failed to delete toast.'
  }
}

watch(canManageAdmin, (ok) => {
  if (ok) void loadToasts()
}, { immediate: true })
</script>

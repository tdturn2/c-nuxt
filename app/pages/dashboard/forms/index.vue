<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80">
      <LeftInternal />
    </aside>

    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Forms Builder</h1>
            <p class="mt-1 text-sm text-gray-600">Create and manage Connect form definitions.</p>
          </div>
          <NuxtLink to="/dashboard/forms/new" class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
            New form
          </NuxtLink>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div v-else-if="!canManageDashboard" class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>
        <template v-else>
          <div class="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Search</label>
              <input v-model="search" type="search" class="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm">
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select v-model="status" class="w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button type="button" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700" @click="loadForms">
              Refresh
            </button>
          </div>

          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-100 text-gray-700">
                <tr>
                  <th class="px-4 py-2 text-left font-semibold">Slug</th>
                  <th class="px-4 py-2 text-left font-semibold">Title</th>
                  <th class="px-4 py-2 text-left font-semibold">Mode</th>
                  <th class="px-4 py-2 text-left font-semibold">Status</th>
                  <th class="px-4 py-2 text-left font-semibold">Updated</th>
                  <th class="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">Loading forms...</td>
                </tr>
                <tr v-else-if="!forms.length" class="border-t border-gray-200">
                  <td colspan="6" class="px-4 py-4 text-gray-500">No forms found.</td>
                </tr>
                <tr v-for="form in forms" :key="form.id" class="border-t border-gray-200">
                  <td class="px-4 py-3 font-medium text-gray-900">{{ form.slug }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ form.title || '—' }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ form.editableMode }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="form.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'">
                      {{ form.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-700">{{ formatDate(form.updatedAt) }}</td>
                  <td class="px-4 py-3 text-right space-x-2">
                    <NuxtLink :to="`/dashboard/forms/${form.id}`" class="text-[rgba(13,94,130,1)] hover:underline">Edit</NuxtLink>
                    <button type="button" class="text-sm text-gray-700 hover:underline" @click="toggleStatus(form)">
                      {{ form.status === 'active' ? 'Deactivate' : 'Activate' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { ConnectFormDefinition, FormStatus } from '~/types/forms'

const { listForms, setFormStatus } = useDashboardForms()
const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', { key: 'dashboard-forms-me' })

const canManageDashboard = computed(() => {
  const user = me.value
  const roles: string[] = Array.isArray(user?.roles) ? user.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const forms = ref<ConnectFormDefinition[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const status = ref<FormStatus | ''>('')

async function loadForms() {
  if (!canManageDashboard.value) return
  loading.value = true
  error.value = null
  try {
    const res = await listForms({ search: search.value.trim(), status: status.value })
    forms.value = Array.isArray(res?.docs) ? res.docs : []
  } catch (e: any) {
    error.value = e?.message || 'Failed to load forms.'
  } finally {
    loading.value = false
  }
}

async function toggleStatus(form: ConnectFormDefinition) {
  const next = form.status === 'active' ? 'inactive' : 'active'
  try {
    await setFormStatus(form.id, next)
    form.status = next
  } catch (e: any) {
    error.value = e?.message || 'Failed to update status.'
  }
}

function formatDate(value?: string) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

watch([canManageDashboard, search, status], () => {
  loadForms()
}, { immediate: true })
</script>

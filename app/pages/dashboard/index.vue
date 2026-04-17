<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside
      class="sticky top-15 self-start shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80"
    >
      <LeftInternal />
    </aside>

    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p class="mt-1 text-sm text-gray-600">
            Admin panel for Connect dashboard sections.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">
          Checking access...
        </div>

        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>

        <template v-else>
          <div class="grid gap-4 sm:grid-cols-2">
            <NuxtLink
              v-for="section in sections"
              :key="section.to"
              :to="section.to"
              class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold text-gray-900">
                    {{ section.title }}
                  </h2>
                  <p class="mt-1 text-sm text-gray-600">
                    {{ section.description }}
                  </p>
                </div>
                <UIcon
                  :name="section.icon"
                  class="h-5 w-5 text-[rgba(13,94,130,1)] shrink-0"
                />
              </div>
              <p class="mt-4 text-sm font-medium text-[rgba(13,94,130,1)]">
                Open section
              </p>
            </NuxtLink>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-index-me',
})

const canManageDashboard = computed(() => {
  const user = me.value
  if (!user) return false
  const roles: string[] = Array.isArray(user.roles) ? user.roles : []
  return roles.some((r) => String(r).toLowerCase() === 'staff')
})

const sections = [
  {
    title: 'Docs / Pages',
    description: 'Manage Connect pages, content, contacts, and media links.',
    to: '/dashboard/docs',
    icon: 'i-lucide-file-text',
  },
  {
    title: 'Degree Builder',
    description: 'Manage degree templates, sections, and required courses.',
    to: '/dashboard/degrees',
    icon: 'i-lucide-graduation-cap',
  },
  {
    title: 'Forms Builder',
    description: 'Create and manage schema-driven Connect forms.',
    to: '/dashboard/forms',
    icon: 'i-lucide-square-pen',
  },
  {
    title: 'Form Results',
    description: 'Review incoming form submissions and exported responses.',
    to: '/dashboard/form-results',
    icon: 'i-lucide-clipboard-list',
  },
]
</script>

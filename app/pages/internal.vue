<template>
  <div class="flex min-h-0 bg-gray-50">
    <aside
      class="sticky top-[3.75rem] self-start flex-shrink-0 h-[calc(100vh-3.75rem)] overflow-hidden w-80 min-w-80"
    >
      <LeftColumn />
    </aside>
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Departments and Offices</h1>
        <p class="text-sm text-gray-600 mb-8">
          Browse departments and offices by area, or use the menu on the left.
        </p>

        <div v-if="isTreeLoading" class="py-12 text-center text-gray-500">Loading...</div>
        <div v-else-if="!categorySections.length" class="py-12 text-center text-gray-500">
          No departments are available yet.
        </div>

        <div v-else class="space-y-8">
          <section
            v-for="section in categorySections"
            :key="section.label"
            class="rounded-2xl border border-gray-200/80 bg-white/90 p-4 sm:p-5 shadow-sm"
          >
            <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ section.label }}</h2>
            <div v-if="!section.items.length" class="text-sm text-gray-500">No pages in this area yet.</div>
            <div v-else class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <NuxtLink
                v-for="item in section.items"
                :key="item.path"
                :to="item.path"
                class="group flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-[rgba(13,94,130,0.35)] hover:bg-white hover:text-[rgba(13,94,130,1)] hover:shadow-sm"
              >
                <span class="truncate pr-3">{{ item.label }}</span>
                <span class="text-gray-400 group-hover:text-[rgba(13,94,130,1)]" aria-hidden="true">→</span>
              </NuxtLink>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import {
  buildConnectPageCategoryNavItems,
  CONNECT_PAGES_TREE_KEY,
  fetchAllConnectPages,
} from '~/composables/useConnectPagesTree'

useHead({ title: 'Departments and Offices | Asbury Connect' })

const { data: pagesData, pending, status } = useAsyncData<any>(CONNECT_PAGES_TREE_KEY, () => fetchAllConnectPages({
  limit: 100,
  depth: 2,
  sort: 'order,title',
}), { lazy: true })

const isTreeLoading = computed(() => pending.value || status.value === 'idle')

const categorySections = computed(() => {
  const docs = Array.isArray(pagesData.value?.docs) ? pagesData.value.docs : []
  return buildConnectPageCategoryNavItems(docs)
    .map((section) => ({
      label: String(section.label || 'Section'),
      items: (section.children || [])
        .filter((item): item is NavigationMenuItem & { to: string } => typeof item.to === 'string' && item.to.length > 0)
        .map((item) => ({
          label: String(item.label || item.to),
          path: item.to,
        })),
    }))
    .filter((section) => section.items.length > 0)
})
</script>

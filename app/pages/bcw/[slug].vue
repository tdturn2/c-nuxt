<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <div v-if="!page" class="px-6 py-16 text-center text-gray-500">
        Page not found.
      </div>
      <BcwPageView v-else :page="page" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { getBcwPage } from '@shared/bcwPages'
import BcwPageView from '~/components/bcw/BcwPageView.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').trim().toLowerCase())
const page = computed(() => getBcwPage(slug.value))

if (import.meta.server && !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'BCW page not found' })
}

useSeoMeta({
  title: () => page.value?.title || 'Better Christian Workplace',
  description: () => page.value?.metaDescription,
})
</script>

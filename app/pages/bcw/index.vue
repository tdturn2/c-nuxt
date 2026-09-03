<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <BcwPageView :page="page" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { getBcwPage } from '@shared/bcwPages'
import BcwPageView from '~/components/bcw/BcwPageView.vue'

const page = getBcwPage('')!

useSeoMeta({
  title: page.title,
  description: page.metaDescription,
})
</script>

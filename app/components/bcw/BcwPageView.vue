<template>
  <div class="bcw-page bg-gray-50">
    <nav class="border-b border-gray-200 bg-white px-4 sm:px-6">
      <div class="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-2 text-sm">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="shrink-0 rounded-md px-3 py-1.5 font-medium transition-colors"
          :class="isActive(item.to)
            ? 'bg-[rgba(13,94,130,0.1)] text-[rgba(13,94,130,1)]'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
        >
          {{ item.label }}
        </NuxtLink>
      </div>
    </nav>

    <BcwHero
      v-if="page.hero?.backgroundImage && page.hero?.lockupImage"
      :background-image="page.hero.backgroundImage"
      :lockup-image="page.hero.lockupImage"
      :alt="page.title"
    />

    <BcwSectionHeader
      :eyebrow="page.section.eyebrow"
      :title="page.section.title"
      :body="page.section.body"
      :image="page.section.image"
      :image-alt="page.section.imageAlt || page.section.title"
    />

    <BcwIntro :title="page.intro.title" :body="page.intro.body" />

    <BcwCardGrid v-if="page.cards.length" :cards="page.cards" />
  </div>
</template>

<script setup lang="ts">
import { bcwNavItems, type BcwPage } from '@shared/bcwPages'
import BcwHero from '~/components/bcw/BcwHero.vue'
import BcwSectionHeader from '~/components/bcw/BcwSectionHeader.vue'
import BcwIntro from '~/components/bcw/BcwIntro.vue'
import BcwCardGrid from '~/components/bcw/BcwCardGrid.vue'

defineProps<{
  page: BcwPage
}>()

const route = useRoute()
const navItems = bcwNavItems()

function isActive(to: string) {
  const path = route.path.replace(/\/$/, '') || '/'
  const target = to.replace(/\/$/, '') || '/'
  return path === target
}
</script>

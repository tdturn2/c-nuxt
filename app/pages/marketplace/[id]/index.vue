<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-4">
          <NuxtLink to="/marketplace" class="text-sm text-[rgba(13,94,130,1)] hover:underline">Back to Marketplace</NuxtLink>
        </div>

        <template v-if="pending">
          <ConnectDirectorySkeleton :show-count-line="false" :show-pagination-row="false" />
        </template>

        <div v-else-if="fetchError" class="bg-red-50 border border-red-200 rounded-md p-4 text-red-800 text-sm">
          {{ fetchError }}
        </div>

        <article v-else-if="listing" class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div v-if="images.length" class="bg-gray-100">
            <img :src="selectedImage" :alt="listing.title" class="max-h-[28rem] w-full object-cover" />
            <div v-if="images.length > 1" class="flex gap-2 overflow-x-auto p-3">
              <button
                v-for="(src, index) in images"
                :key="`listing-photo-${index}`"
                type="button"
                class="h-16 w-16 shrink-0 overflow-hidden rounded-md ring-1 ring-gray-200"
                :class="src === selectedImage ? 'ring-2 ring-[rgba(13,94,130,1)]' : ''"
                @click="selectedImage = src"
              >
                <img :src="src" :alt="`${listing.title} photo ${index + 1}`" class="h-full w-full object-cover" />
              </button>
            </div>
          </div>
          <div v-else class="flex h-48 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
            <UIcon name="i-heroicons-photo" class="h-10 w-10 text-gray-300" />
          </div>
          <div class="p-6">
            <div class="flex items-start justify-between gap-4">
              <h1 class="text-2xl font-bold text-gray-900">{{ listing.title }}</h1>
              <span class="rounded-full bg-gray-100 px-3 py-1 text-sm capitalize text-gray-700">{{ listing.status || 'active' }}</span>
            </div>
            <p class="mt-2 text-lg font-semibold text-[rgba(13,94,130,1)]">{{ formatPrice(listing) }}</p>
            <NuxtLink
              v-if="authorProfile"
              :to="authorProfile"
              class="mt-4 flex items-center gap-3"
            >
              <span class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                <img v-if="authorAvatar" :src="authorAvatar" :alt="authorName" class="h-full w-full object-cover" />
                <template v-else>{{ authorInitial }}</template>
              </span>
              <span>
                <span class="block text-sm font-medium text-gray-900">{{ authorName }}</span>
                <span v-if="postedLabel" class="block text-xs text-gray-500">Posted {{ postedLabel }}</span>
              </span>
            </NuxtLink>
            <div
              v-if="descriptionHtml"
              class="marketplace-description mt-4 text-sm leading-relaxed text-gray-700"
              v-html="descriptionHtml"
            />
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { mediaDisplayUrl } from '@shared/mediaUrls'
import { marketplaceDescriptionText, sanitizeMarketplaceDescription } from '~/utils/marketplaceDescription'

type MarketplaceMedia = { id: number; url?: string | null } | number
type MarketplaceAuthor = {
  id?: number
  name?: string | null
  email?: string | null
  avatar?: { url?: string | null } | number | null
  avatarConnectUserMedia?: { url?: string | null } | number | null
}
type MarketplaceListing = {
  id: number
  author?: MarketplaceAuthor | number
  title: string
  description: string
  priceType: 'amount' | 'free' | 'contact'
  price?: number | null
  status?: 'active' | 'sold' | 'archived'
  media?: MarketplaceMedia[] | null
  createdAt?: string | null
}

const route = useRoute()
const id = computed(() => String(route.params.id || ''))
const { data, pending, error } = await useLazyFetch<MarketplaceListing>(() => `/api/marketplace/${id.value}`, {
  watch: [id],
})

const listing = computed(() => data.value || null)
const fetchError = computed(() => {
  const e = error.value as any
  if (!e) return null
  return e.data?.message || e.statusMessage || 'Failed to load listing'
})

const images = computed(() => {
  const media = listing.value?.media
  if (!Array.isArray(media)) return []
  return media
    .map((item) => (item && typeof item === 'object' ? mediaDisplayUrl(item.url, 1200) : null))
    .filter((url): url is string => Boolean(url))
})
const selectedImage = ref('')
watch(images, (urls) => {
  if (!urls.includes(selectedImage.value)) selectedImage.value = urls[0] || ''
}, { immediate: true })

const author = computed(() => {
  const value = listing.value?.author
  if (!value || typeof value === 'number') return null
  return value
})
const authorName = computed(() => author.value?.name?.trim() || 'Community member')
const authorInitial = computed(() => authorName.value.charAt(0).toUpperCase() || '?')
const authorAvatar = computed(() => {
  const preferred = author.value?.avatarConnectUserMedia
  const legacy = author.value?.avatar
  const raw =
    (preferred && typeof preferred === 'object' ? preferred.url : null) ||
    (legacy && typeof legacy === 'object' ? legacy.url : null)
  return mediaDisplayUrl(raw, 128)
})
const authorProfile = computed(() => {
  const username = author.value?.email?.split('@')[0]?.trim()
  return username ? `/user/${encodeURIComponent(username)}` : null
})
const descriptionHtml = computed(() => {
  const text = marketplaceDescriptionText(listing.value?.description)
  if (!text) return ''
  return sanitizeMarketplaceDescription(listing.value?.description)
})
const postedLabel = computed(() => {
  const value = listing.value?.createdAt
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
})

function formatPrice(listing: MarketplaceListing): string {
  if (listing.priceType === 'free') return 'Free'
  if (listing.priceType === 'contact') return 'Contact for price'
  const amount = typeof listing.price === 'number' ? listing.price : null
  if (amount == null) return '$0'
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
</script>

<style scoped>
.marketplace-description :deep(a) {
  color: rgb(13, 94, 130);
  text-decoration: underline;
}
.marketplace-description :deep(ul) {
  list-style: disc;
  margin: 0.35rem 0;
  padding-left: 1.25rem;
}
.marketplace-description :deep(ol) {
  list-style: decimal;
  margin: 0.35rem 0;
  padding-left: 1.25rem;
}
.marketplace-description :deep(p) {
  margin: 0.35rem 0;
}
.marketplace-description :deep(p:first-child) {
  margin-top: 0;
}
.marketplace-description :deep(p:last-child) {
  margin-bottom: 0;
}
</style>

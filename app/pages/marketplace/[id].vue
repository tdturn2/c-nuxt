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

        <article v-else-if="listing" class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div class="h-80 bg-gray-100 overflow-hidden flex items-center justify-center">
            <img v-if="firstImage" :src="firstImage" :alt="listing.title" class="w-full h-full object-cover" />
            <span v-else class="text-gray-400 text-sm">No image</span>
          </div>
          <div class="p-6">
            <div class="flex items-start justify-between gap-4">
              <h1 class="text-2xl font-bold text-gray-900">{{ listing.title }}</h1>
              <span class="text-sm rounded-full px-3 py-1 bg-gray-100 text-gray-700 capitalize">{{ listing.status || 'active' }}</span>
            </div>
            <p class="mt-2 text-lg font-semibold text-[rgba(13,94,130,1)]">{{ formatPrice(listing) }}</p>
            <p class="mt-4 text-gray-700 whitespace-pre-line">{{ listing.description }}</p>
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type MarketplaceMedia = { id: number; url?: string | null } | number
type MarketplaceListing = {
  id: number
  title: string
  description: string
  priceType: 'amount' | 'free' | 'contact'
  price?: number | null
  status?: 'active' | 'sold' | 'archived'
  media?: MarketplaceMedia[] | null
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

const firstImage = computed(() => {
  const media = listing.value?.media
  if (!Array.isArray(media) || !media.length) return null
  const first = media[0]
  if (typeof first === 'number') return null
  return first.url || null
})

function formatPrice(listing: MarketplaceListing): string {
  if (listing.priceType === 'free') return 'Free'
  if (listing.priceType === 'contact') return 'Contact for price'
  const amount = typeof listing.price === 'number' ? listing.price : null
  if (amount == null) return '$0'
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
</script>

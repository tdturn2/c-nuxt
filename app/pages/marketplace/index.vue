<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Marketplace</h1>
        <p class="text-sm text-gray-600 mb-6">
          Buy, sell, and rent within the Asbury community.
        </p>
        <div class="mb-4 flex justify-end">
          <NuxtLink
            to="/marketplace/new"
            class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] transition-colors"
          >
            Create Listing
          </NuxtLink>
        </div>

        <div class="flex flex-wrap items-end gap-3 sm:gap-4 mb-6">
          <div class="w-full sm:flex-1 sm:min-w-[240px] sm:max-w-md">
            <label for="marketplace-search" class="sr-only">Search listings</label>
            <input
              id="marketplace-search"
              v-model="searchQuery"
              type="search"
              placeholder="Search listings..."
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
            />
          </div>

          <div class="min-w-[10rem]">
            <label for="marketplace-category" class="sr-only">Category</label>
            <USelectMenu
              id="marketplace-category"
              v-model="selectedCategory"
              :items="categoryOptions"
              value-attribute="value"
              label-attribute="label"
              class="w-full"
              placeholder="All categories"
            />
          </div>

          <div class="min-w-[10rem]">
            <label for="marketplace-type" class="sr-only">Listing type</label>
            <USelectMenu
              id="marketplace-type"
              v-model="selectedListingType"
              :items="listingTypeOptions"
              value-attribute="value"
              label-attribute="label"
              class="w-full"
              placeholder="Sale + Rent"
            />
          </div>
          <label class="inline-flex items-center gap-2 text-sm text-gray-700">
            <input v-model="showMineOnly" type="checkbox" class="rounded border-gray-300 text-[rgba(13,94,130,1)]" />
            My Listings
          </label>
        </div>

        <template v-if="pending && !hasLoadedOnce">
          <ConnectDirectorySkeleton :show-count-line="true" :show-pagination-row="true" />
        </template>

        <div v-else-if="fetchError" class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="text-red-800 text-sm">{{ fetchError }}</div>
        </div>

        <div v-else>
          <div class="mb-2 text-sm text-gray-600">
            Showing {{ rangeStart }}–{{ rangeEnd }} of {{ totalDocs }} listings
          </div>

          <div v-if="docs.length === 0" class="text-gray-500 py-8">
            No listings match your filters.
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <article
              v-for="listing in docs"
              :key="listing.id"
              class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div class="h-40 bg-gray-100 overflow-hidden flex items-center justify-center">
                <img
                  v-if="firstMediaUrl(listing)"
                  :src="firstMediaUrl(listing)!"
                  :alt="listing.title"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-gray-400 text-sm">No image</span>
              </div>

              <div class="p-4">
                <div class="flex items-start justify-between gap-2">
                  <NuxtLink :to="`/marketplace/${listing.id}`" class="font-semibold text-gray-900 line-clamp-2 hover:text-[rgba(13,94,130,1)]">
                    {{ listing.title }}
                  </NuxtLink>
                  <span class="text-xs rounded-full px-2 py-0.5 bg-gray-100 text-gray-600 shrink-0">
                    {{ formatListingType(listing.listingType) }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-gray-600 line-clamp-3">{{ listing.description }}</p>

                <div class="mt-3 flex items-center justify-between">
                  <p class="font-semibold text-[rgba(13,94,130,1)]">{{ formatPrice(listing) }}</p>
                  <p class="text-xs text-gray-500 capitalize">{{ listing.category }}</p>
                </div>
                <div v-if="isOwner(listing)" class="mt-3 flex items-center justify-end gap-2">
                  <NuxtLink
                    :to="`/marketplace/${listing.id}/edit`"
                    class="text-xs rounded border border-gray-300 px-2 py-1 text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </NuxtLink>
                  <button
                    type="button"
                    class="text-xs rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                    @click="deleteListing(listing.id)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div v-if="totalPages > 1" class="mt-6 flex flex-wrap items-center justify-between gap-2 sm:justify-center">
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              :disabled="page <= 1"
              @click="page = Math.max(1, page - 1)"
            >
              Previous
            </button>
            <span class="text-sm text-gray-600">Page {{ page }} of {{ totalPages }}</span>
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
              :disabled="page >= totalPages"
              @click="page = Math.min(totalPages, page + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'

type MarketplaceMedia = { id: number; url?: string | null } | number
type MarketplaceListing = {
  id: number
  author?: { id?: number } | number
  title: string
  description: string
  priceType: 'amount' | 'free' | 'contact'
  price?: number | null
  category: string
  listingType: 'sale' | 'rent' | 'short_term_rental'
  status?: 'active' | 'sold' | 'archived'
  media?: MarketplaceMedia[] | null
}
type MarketplaceResponse = {
  docs: MarketplaceListing[]
  totalDocs: number
  page: number
  limit: number
  totalPages: number
}

const categoryOptions = [
  { label: 'All categories', value: '' },
  { label: 'Furniture', value: 'furniture' },
  { label: 'Books', value: 'books' },
  { label: 'Housing', value: 'housing' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Other', value: 'other' },
]

const listingTypeOptions = [
  { label: 'All listing types', value: '' },
  { label: 'Sale', value: 'sale' },
  { label: 'Rent', value: 'rent' },
  { label: 'Short Term Rental', value: 'short_term_rental' },
]

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedListingType = ref('')
const showMineOnly = ref(false)
const page = ref(1)
const limit = 24
const data = ref<MarketplaceResponse>({ docs: [], totalDocs: 0, page: 1, limit, totalPages: 1 })
const pending = ref(false)
const error = ref<any>(null)
const hasLoadedOnce = ref(false)
let requestToken = 0
const { data: mePayload } = await useLazyFetch<{ doc?: { id?: number } }>('/api/connect-users/me', { server: false })
const meUserId = computed(() => mePayload.value?.doc?.id || null)

const docs = computed(() => data.value.docs ?? [])
const totalDocs = computed(() => data.value.totalDocs ?? 0)
const totalPages = computed(() => data.value.totalPages ?? 1)
const rangeStart = computed(() => (totalDocs.value === 0 ? 0 : (page.value - 1) * limit + 1))
const rangeEnd = computed(() => Math.min(page.value * limit, totalDocs.value))
const fetchError = computed(() => {
  const e = error.value as any
  if (!e) return null
  return e.data?.message || e.statusMessage || 'Failed to load marketplace listings'
})

const loadListings = async () => {
  const token = ++requestToken
  pending.value = true
  error.value = null

  try {
    const response = await $fetch<MarketplaceResponse>('/api/marketplace/list', {
      query: {
        q: searchQuery.value || undefined,
        category: selectedCategory.value || undefined,
        listingType: selectedListingType.value || undefined,
        mine: showMineOnly.value ? '1' : undefined,
        page: page.value,
        limit,
      },
      credentials: 'include',
    })
    if (token !== requestToken) return
    data.value = response
    hasLoadedOnce.value = true
  } catch (e: any) {
    if (token !== requestToken) return
    error.value = e
  } finally {
    if (token === requestToken) pending.value = false
  }
}

watchDebounced([searchQuery, selectedCategory, selectedListingType, showMineOnly], () => {
  if (page.value !== 1) {
    page.value = 1
    return
  }
  loadListings()
}, { debounce: 250, maxWait: 600 })

watch(page, () => {
  loadListings()
})

function firstMediaUrl(listing: MarketplaceListing): string | null {
  if (!Array.isArray(listing.media) || listing.media.length === 0) return null
  const first = listing.media[0]
  if (typeof first === 'number') return null
  return first.url || null
}

function formatPrice(listing: MarketplaceListing): string {
  if (listing.priceType === 'free') return 'Free'
  if (listing.priceType === 'contact') return 'Contact for price'
  const amount = typeof listing.price === 'number' ? listing.price : null
  if (amount == null) return '$0'
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function formatListingType(type: MarketplaceListing['listingType']): string {
  if (type === 'short_term_rental') return 'Short Term Rental'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function isOwner(listing: MarketplaceListing): boolean {
  const authorId = typeof listing.author === 'number' ? listing.author : listing.author?.id
  return Boolean(authorId && meUserId.value && authorId === meUserId.value)
}

async function deleteListing(id: number) {
  if (!confirm('Delete this listing?')) return
  try {
    await $fetch(`/api/marketplace/${id}`, { method: 'DELETE', credentials: 'include' })
    await loadListings()
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Failed to delete listing')
  }
}

await loadListings()
</script>
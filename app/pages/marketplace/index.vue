<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Marketplace</h1>
            <p class="mt-1 text-sm text-gray-600">
              Buy, sell, and rent within the Asbury community.
            </p>
          </div>
          <NuxtLink
            to="/marketplace/new"
            class="inline-flex w-fit rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] transition-colors"
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
              class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md"
            >
              <NuxtLink :to="`/marketplace/${listing.id}`" class="relative block aspect-[4/3] bg-gray-100">
                <img
                  v-if="coverImage(listing)"
                  :src="coverImage(listing)!"
                  :alt="listing.title"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
                  <UIcon name="i-heroicons-photo" class="h-10 w-10 text-gray-300" />
                </div>
                <span class="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-800 shadow-sm">
                  {{ formatListingType(listing.listingType) }}
                </span>
                <span
                  v-if="imageUrls(listing).length > 1"
                  class="absolute bottom-3 right-3 rounded-full bg-gray-900/75 px-2 py-0.5 text-xs font-medium text-white"
                >
                  {{ imageUrls(listing).length }} photos
                </span>
              </NuxtLink>

              <div v-if="imageUrls(listing).length > 1" class="flex gap-1.5 overflow-x-auto px-3 pt-3">
                <img
                  v-for="(src, index) in imageUrls(listing)"
                  :key="`${listing.id}-photo-${index}`"
                  :src="src"
                  :alt="`${listing.title} photo ${index + 1}`"
                  class="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-gray-200"
                  :class="index === 0 ? 'ring-2 ring-[rgba(13,94,130,1)]' : ''"
                />
              </div>

              <div class="flex flex-1 flex-col p-4">
                <div class="flex items-start justify-between gap-3">
                  <NuxtLink :to="`/marketplace/${listing.id}`" class="font-semibold text-gray-900 line-clamp-2 hover:text-[rgba(13,94,130,1)]">
                    {{ listing.title }}
                  </NuxtLink>
                  <p class="shrink-0 text-base font-semibold text-[rgba(13,94,130,1)]">{{ formatPrice(listing) }}</p>
                </div>
                <p class="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{{ formatCategory(listing.category) }}</p>
                <p class="mt-2 text-sm text-gray-600 line-clamp-2">{{ descriptionPreview(listing.description) }}</p>

                <div class="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                  <NuxtLink
                    v-if="authorProfile(listing)"
                    :to="authorProfile(listing)!"
                    class="flex min-w-0 items-center gap-2"
                  >
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                      <img
                        v-if="authorAvatar(listing)"
                        :src="authorAvatar(listing)!"
                        :alt="authorName(listing)"
                        class="h-full w-full object-cover"
                      />
                      <template v-else>{{ authorInitial(listing) }}</template>
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-medium text-gray-900 hover:text-[rgba(13,94,130,1)]">{{ authorName(listing) }}</span>
                      <span v-if="formatPosted(listing.createdAt)" class="block text-xs text-gray-500">{{ formatPosted(listing.createdAt) }}</span>
                    </span>
                  </NuxtLink>
                  <div v-else class="flex min-w-0 items-center gap-2">
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                      {{ authorInitial(listing) }}
                    </span>
                    <span class="min-w-0">
                      <span class="block truncate text-sm font-medium text-gray-900">{{ authorName(listing) }}</span>
                      <span v-if="formatPosted(listing.createdAt)" class="block text-xs text-gray-500">{{ formatPosted(listing.createdAt) }}</span>
                    </span>
                  </div>
                  <div v-if="isOwner(listing)" class="flex shrink-0 items-center gap-1">
                    <NuxtLink
                      :to="`/marketplace/${listing.id}/edit`"
                      class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </NuxtLink>
                    <button
                      type="button"
                      class="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      @click="deleteListing(listing.id)"
                    >
                      Delete
                    </button>
                  </div>
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
import { mediaDisplayUrl } from '@shared/mediaUrls'
import { marketplaceDescriptionText } from '~/utils/marketplaceDescription'

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
  category: string
  listingType: 'sale' | 'rent' | 'short_term_rental'
  status?: 'active' | 'sold' | 'archived'
  media?: MarketplaceMedia[] | null
  createdAt?: string | null
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

function imageUrls(listing: MarketplaceListing): string[] {
  if (!Array.isArray(listing.media)) return []
  return listing.media
    .map((media) => {
      if (!media || typeof media === 'number') return null
      return mediaDisplayUrl(media.url, 800)
    })
    .filter((url): url is string => Boolean(url))
}

function coverImage(listing: MarketplaceListing): string | null {
  return imageUrls(listing)[0] || null
}

function listingAuthor(listing: MarketplaceListing): MarketplaceAuthor | null {
  if (!listing.author || typeof listing.author === 'number') return null
  return listing.author
}

function authorName(listing: MarketplaceListing): string {
  return listingAuthor(listing)?.name?.trim() || 'Community member'
}

function authorInitial(listing: MarketplaceListing): string {
  return authorName(listing).charAt(0).toUpperCase() || '?'
}

function authorAvatar(listing: MarketplaceListing): string | null {
  const author = listingAuthor(listing)
  if (!author) return null
  const preferred = author.avatarConnectUserMedia
  const legacy = author.avatar
  const raw =
    (preferred && typeof preferred === 'object' ? preferred.url : null) ||
    (legacy && typeof legacy === 'object' ? legacy.url : null)
  return mediaDisplayUrl(raw, 96)
}

function authorProfile(listing: MarketplaceListing): string | null {
  const email = listingAuthor(listing)?.email
  const username = email?.split('@')[0]?.trim()
  return username ? `/user/${encodeURIComponent(username)}` : null
}

function formatPosted(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function descriptionPreview(value: string): string {
  return marketplaceDescriptionText(value)
}

function formatCategory(category: string): string {
  return categoryOptions.find((option) => option.value === category)?.label || category
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
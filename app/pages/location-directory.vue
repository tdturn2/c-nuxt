<template>
  <div class="flex min-h-0 bg-gray-50">
    <LeftColumn />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">By Location</h1>
          <p class="mt-2 max-w-2xl text-sm text-gray-600">
            Explore people on Connect by where they live. Start with the globe, then drill into the United States by state.
          </p>
        </div>

        <nav v-if="crumbs.length" class="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-600" aria-label="Breadcrumb">
          <button
            type="button"
            class="font-medium text-[rgba(13,94,130,1)] hover:underline"
            @click="goWorld"
          >
            World
          </button>
          <template v-for="(crumb, index) in crumbs" :key="crumb.key">
            <span class="text-gray-400">/</span>
            <button
              v-if="index < crumbs.length - 1"
              type="button"
              class="font-medium text-[rgba(13,94,130,1)] hover:underline"
              @click="crumb.onClick?.()"
            >
              {{ crumb.label }}
            </button>
            <span v-else class="font-medium text-gray-900">{{ crumb.label }}</span>
          </template>
        </nav>

        <template v-if="loading">
          <p class="sr-only">Loading location directory…</p>
          <div class="mx-auto aspect-square max-w-xl animate-pulse rounded-full bg-gray-200" />
        </template>

        <div v-else-if="error" class="rounded-md border border-red-200 bg-red-50 p-4">
          <div class="text-sm text-red-800">{{ error }}</div>
        </div>

        <template v-else>
          <ClientOnly v-if="view === 'world'">
            <LocationGlobe
              :active-countries="activeCountries"
              @select="onCountrySelect"
            />
            <template #fallback>
              <div class="mx-auto aspect-square max-w-xl animate-pulse rounded-full bg-gray-200" />
            </template>
          </ClientOnly>

          <ClientOnly v-else-if="view === 'usa'">
            <LocationUsMap
              :active-states="activeStates"
              @select="onStateSelect"
            />
            <template #fallback>
              <div class="mx-auto h-72 max-w-4xl animate-pulse rounded-xl bg-gray-200" />
            </template>
          </ClientOnly>

          <template v-else>
            <div class="mb-6 flex flex-wrap items-end gap-3 sm:gap-4">
              <div v-if="selectedCountry === 'US' && cityOptions.length" class="flex min-w-40 flex-col gap-1">
                <label for="loc-city" class="text-sm font-medium text-gray-700">City</label>
                <select
                  id="loc-city"
                  v-model="filterCity"
                  class="w-full min-w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)] sm:w-56"
                >
                  <option value="">All cities</option>
                  <option v-for="name in cityOptions" :key="name" :value="name">
                    {{ name }}
                  </option>
                </select>
              </div>
              <div class="w-full sm:max-w-md sm:min-w-50 sm:flex-1">
                <label for="loc-search" class="sr-only">Search by name</label>
                <input
                  id="loc-search"
                  v-model="searchQuery"
                  type="search"
                  placeholder="Search by name..."
                  class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)]"
                  autocomplete="off"
                >
              </div>
            </div>

            <div v-if="filteredPeople.length === 0" class="py-8 text-gray-500">
              No people found for this location yet.
            </div>

            <template v-else>
              <div class="mb-2 text-sm text-gray-600">
                {{ filteredPeople.length }}
                {{ filteredPeople.length === 1 ? 'person' : 'people' }}
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <NuxtLink
                  v-for="person in filteredPeople"
                  :key="person.id"
                  :to="userProfilePath(person)"
                  class="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm transition-colors hover:border-gray-300"
                >
                  <div class="mb-3 flex h-30 w-30 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                    <img
                      v-if="person.avatar?.url"
                      :src="mediaDisplayUrl(person.avatar.url, 256) || person.avatar.url"
                      :alt="person.name"
                      class="h-full w-full object-cover"
                    >
                    <span v-else class="text-2xl font-semibold text-gray-500">
                      {{ person.name?.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div class="w-full min-w-0">
                    <h2 class="truncate font-semibold text-gray-900 hover:text-[rgba(13,94,130,1)]">
                      {{ person.name }}
                    </h2>
                    <p v-if="person.employeeTitle" class="truncate text-sm text-gray-600">
                      {{ person.employeeTitle }}
                    </p>
                    <p v-if="person.roles.length" class="mt-0.5 text-xs text-gray-500">
                      {{ person.roles.join(' · ') }}
                    </p>
                    <p v-if="placeLabel(person)" class="mt-1 text-xs text-gray-500">
                      {{ placeLabel(person) }}
                    </p>
                  </div>
                </NuxtLink>
              </div>
            </template>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { formatHomeLocation } from '@shared/geo'
import { mediaDisplayUrl } from '@shared/mediaUrls'
import LocationGlobe from '~/components/directory/LocationGlobe.vue'
import LocationUsMap from '~/components/directory/LocationUsMap.vue'

type PersonRow = {
  id: number
  name: string
  email: string | null
  employeeTitle: string | null
  country: string
  region: string | null
  city: string | null
  roles: string[]
  avatar: { url: string } | null
}

type View = 'world' | 'usa' | 'people'

const view = ref<View>('world')
const selectedCountry = ref('')
const selectedCountryName = ref('')
const selectedRegion = ref('')
const selectedRegionName = ref('')
const filterCity = ref('')
const searchQuery = ref('')

const { data: payload, pending: loading, error: fetchError } = useLazyFetch<{ people: PersonRow[] }>(
  '/api/directory/by-location',
)

const people = computed(() => payload.value?.people ?? [])

const error = computed(() => {
  const e = fetchError.value as any
  if (!e) return null
  return e.data?.message || e.statusMessage || 'Failed to load location directory'
})

const activeCountries = computed(() => {
  const set = new Set<string>()
  for (const p of people.value) {
    if (p.country) set.add(p.country)
  }
  return [...set]
})

const activeStates = computed(() => {
  const set = new Set<string>()
  for (const p of people.value) {
    if (p.country !== 'US') continue
    if (p.region) set.add(p.region)
  }
  return [...set]
})

const cityOptions = computed(() => {
  if (selectedCountry.value !== 'US' || !selectedRegion.value) return []
  const set = new Set<string>()
  for (const p of people.value) {
    if (p.country !== 'US') continue
    if (p.region !== selectedRegion.value) continue
    if (p.city) set.add(p.city)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})

const filteredPeople = computed(() => {
  let list = people.value
  if (selectedCountry.value) {
    list = list.filter((p) => p.country === selectedCountry.value)
  }
  if (selectedCountry.value === 'US' && selectedRegion.value) {
    list = list.filter((p) => p.region === selectedRegion.value)
  }
  if (filterCity.value) {
    list = list.filter((p) => (p.city || '') === filterCity.value)
  }
  const words = searchQuery.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length) {
    list = list.filter((p) => {
      const name = (p.name ?? '').toLowerCase()
      return words.every((word) => name.includes(word))
    })
  }
  return list
})

const crumbs = computed(() => {
  const items: Array<{ key: string; label: string; onClick?: () => void }> = []
  if (selectedCountry.value) {
    items.push({
      key: 'country',
      label: selectedCountryName.value || selectedCountry.value,
      onClick: selectedCountry.value === 'US' ? goUsa : undefined,
    })
  }
  if (selectedRegion.value) {
    items.push({
      key: 'region',
      label: selectedRegionName.value || selectedRegion.value,
    })
  }
  return items
})

function goWorld() {
  view.value = 'world'
  selectedCountry.value = ''
  selectedCountryName.value = ''
  selectedRegion.value = ''
  selectedRegionName.value = ''
  filterCity.value = ''
  searchQuery.value = ''
}

function goUsa() {
  view.value = 'usa'
  selectedRegion.value = ''
  selectedRegionName.value = ''
  filterCity.value = ''
  searchQuery.value = ''
  selectedCountry.value = 'US'
  if (!selectedCountryName.value) selectedCountryName.value = 'United States'
}

function onCountrySelect(payload: { code: string; name: string }) {
  selectedCountry.value = payload.code
  selectedCountryName.value = payload.name
  selectedRegion.value = ''
  selectedRegionName.value = ''
  filterCity.value = ''
  searchQuery.value = ''
  if (payload.code === 'US') {
    view.value = 'usa'
  } else {
    view.value = 'people'
  }
}

function onStateSelect(payload: { code: string; name: string }) {
  selectedRegion.value = payload.code
  selectedRegionName.value = payload.name
  filterCity.value = ''
  searchQuery.value = ''
  view.value = 'people'
}

function userProfilePath(person: { id: number; email: string | null }): string {
  if (person.email?.includes('@')) {
    const username = person.email.split('@')[0]?.trim()
    if (username) return `/user/${encodeURIComponent(username)}`
  }
  return `/user/${person.id}`
}

function placeLabel(person: PersonRow): string {
  return formatHomeLocation({
    country: person.country,
    region: person.region,
    city: person.city,
  })
}

watch(fetchError, (e) => {
  if (e) console.error('Error loading location directory:', e)
})
</script>

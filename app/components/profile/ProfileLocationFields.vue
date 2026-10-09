<template>
  <div>
    <div v-if="error" class="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
      <div class="text-sm text-red-800">{{ error }}</div>
    </div>

    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Where are you located?</h2>
        <p class="mt-1 text-sm text-gray-600">
          Optional home or current location. Shown on your profile and used in directory filters.
          This is separate from office/campus location.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label for="home-country" class="mb-2 block text-sm font-medium text-gray-700">Country</label>
          <select
            id="home-country"
            v-model="country"
            :disabled="disabled"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
          >
            <option value="">Select a country</option>
            <option v-for="c in COUNTRY_OPTIONS" :key="c.value" :value="c.value">
              {{ c.label }}
            </option>
          </select>
        </div>

        <div v-if="isUS">
          <label for="home-state" class="mb-2 block text-sm font-medium text-gray-700">State</label>
          <select
            id="home-state"
            v-model="region"
            :disabled="disabled"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
          >
            <option value="">Select a state</option>
            <option v-for="s in US_STATE_OPTIONS" :key="s.value" :value="s.value">
              {{ s.label }}
            </option>
          </select>
        </div>

        <div v-if="isUS && region">
          <label for="home-city" class="mb-2 block text-sm font-medium text-gray-700">City</label>
          <input
            id="home-city"
            v-model="cityQuery"
            type="search"
            list="home-city-options"
            placeholder="Start typing a city…"
            autocomplete="off"
            :disabled="disabled"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
            @change="syncCityFromQuery"
            @blur="syncCityFromQuery"
          >
          <datalist id="home-city-options">
            <option v-for="name in citySuggestions" :key="name" :value="name" />
          </datalist>
          <p v-if="cityQuery && citiesForState.length && !resolvedCity" class="mt-1 text-xs text-amber-700">
            Choose a city from the suggestions for {{ region }}.
          </p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          v-if="hasSavedLocation"
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="saving || disabled"
          @click="clearLocation"
        >
          Clear
        </button>
        <button
          type="button"
          :disabled="saving || disabled || !canSave"
          @click="handleSubmit"
          class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save Location' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { COUNTRY_OPTIONS, US_STATE_OPTIONS } from '@shared/geo'
import { watchDebounced } from '@vueuse/core'

const props = withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false,
})

const { user: meUser, refresh } = useMe()

const saving = ref(false)
const error = ref<string | null>(null)

const country = ref('')
const region = ref('')
const cityQuery = ref('')
const citySuggestions = ref<string[]>([])
const citiesForState = ref<string[]>([])

const initial = ref({ country: '', region: '', city: '' })

const isUS = computed(() => country.value === 'US')

const resolvedCity = computed(() => {
  const q = cityQuery.value.trim().toLowerCase()
  if (!q) return ''
  return citiesForState.value.find((c) => c.toLowerCase() === q) || ''
})

const draft = computed(() => ({
  country: country.value,
  region: isUS.value ? region.value : '',
  city: isUS.value ? resolvedCity.value : '',
}))

const hasSavedLocation = computed(() => Boolean(initial.value.country))

const hasChanges = computed(() => {
  return (
    draft.value.country !== initial.value.country ||
    draft.value.region !== initial.value.region ||
    draft.value.city !== initial.value.city
  )
})

const canSave = computed(() => {
  if (!hasChanges.value) return false
  if (isUS.value && cityQuery.value.trim() && !resolvedCity.value) return false
  return true
})

let syncingFromUser = false
let cityRequest = 0

function applyUser(user: any) {
  syncingFromUser = true
  const nextCountry = (user?.country || '').toString().trim().toUpperCase()
  const nextRegion = (user?.region || '').toString().trim().toUpperCase()
  const nextCity = (user?.city || '').toString().trim()
  country.value = nextCountry
  region.value = nextRegion
  cityQuery.value = nextCity
  initial.value = { country: nextCountry, region: nextRegion, city: nextCity }
  nextTick(() => {
    syncingFromUser = false
  })
}

watch(meUser, (u) => {
  if (u) applyUser(u)
}, { immediate: true })

watch(country, (next, prev) => {
  if (syncingFromUser || prev === undefined || next === prev) return
  if (next !== 'US') {
    region.value = ''
    cityQuery.value = ''
    citiesForState.value = []
    citySuggestions.value = []
  }
})

watch(region, async (next, prev) => {
  if (next === prev) return
  const keepCity = syncingFromUser
  if (!keepCity && prev !== undefined) cityQuery.value = ''
  citiesForState.value = []
  citySuggestions.value = []
  if (!isUS.value || !next) return
  const requestId = ++cityRequest
  try {
    const res = await $fetch<{ cities: string[] }>('/api/geo/us-cities', {
      query: { state: next },
    })
    if (requestId !== cityRequest) return
    citiesForState.value = res?.cities ?? []
    citySuggestions.value = citiesForState.value.slice(0, 40)
  } catch (e) {
    console.error('Failed to load cities', e)
  }
}, { immediate: true })

watchDebounced(
  cityQuery,
  (q) => {
    const needle = q.trim().toLowerCase()
    if (!needle) {
      citySuggestions.value = citiesForState.value.slice(0, 40)
      return
    }
    citySuggestions.value = citiesForState.value
      .filter((c) => c.toLowerCase().includes(needle))
      .slice(0, 40)
  },
  { debounce: 150 },
)

function syncCityFromQuery() {
  if (resolvedCity.value) cityQuery.value = resolvedCity.value
}

async function handleSubmit() {
  if (props.disabled || !canSave.value || saving.value) return
  syncCityFromQuery()

  try {
    saving.value = true
    error.value = null

    const updated = await $fetch('/api/employees/profile', {
      method: 'PATCH',
      body: {
        country: draft.value.country || null,
        region: draft.value.region || null,
        city: draft.value.city || null,
      },
    })
    applyUser(updated)
    refresh()
  } catch (err: any) {
    console.error('Error updating home location:', err)
    error.value = err.data?.error || err.data?.message || 'Failed to update location'
  } finally {
    saving.value = false
  }
}

async function clearLocation() {
  if (props.disabled || saving.value) return
  country.value = ''
  region.value = ''
  cityQuery.value = ''
  await handleSubmit()
}
</script>

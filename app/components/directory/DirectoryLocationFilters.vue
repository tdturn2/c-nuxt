<template>
  <div class="flex flex-wrap items-end gap-3 sm:gap-4">
    <div v-if="showCountry" class="flex min-w-40 flex-col gap-1">
      <label :for="`${idPrefix}-country`" class="text-sm font-medium text-gray-700">Country</label>
      <select
        :id="`${idPrefix}-country`"
        v-model="country"
        class="w-full min-w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)] sm:w-56"
      >
        <option value="">All countries</option>
        <option v-for="c in countryChoices" :key="c.value" :value="c.value">
          {{ c.label }}
        </option>
      </select>
    </div>

    <div v-if="showState" class="flex min-w-40 flex-col gap-1">
      <label :for="`${idPrefix}-state`" class="text-sm font-medium text-gray-700">State</label>
      <select
        :id="`${idPrefix}-state`"
        v-model="region"
        class="w-full min-w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)] sm:w-56"
      >
        <option value="">All states</option>
        <option v-for="s in stateChoices" :key="s.value" :value="s.value">
          {{ s.label }}
        </option>
      </select>
    </div>

    <div v-if="showState && region" class="flex min-w-40 flex-col gap-1">
      <label :for="`${idPrefix}-city`" class="text-sm font-medium text-gray-700">City</label>
      <select
        :id="`${idPrefix}-city`"
        v-model="city"
        class="w-full min-w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[rgba(13,94,130,1)] focus:outline-none focus:ring-1 focus:ring-[rgba(13,94,130,1)] sm:w-56"
      >
        <option value="">All cities</option>
        <option v-for="name in cityChoices" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { COUNTRY_OPTIONS, US_STATE_OPTIONS, countryLabel, usStateLabel } from '@shared/geo'

const props = withDefaults(
  defineProps<{
    idPrefix?: string
    /** When false, hide country and treat filters as US state/city only. */
    showCountry?: boolean
    /** Distinct country codes present in the directory dataset */
    availableCountries?: string[]
    /** Distinct US state codes present (when filtering within US data) */
    availableRegions?: string[]
    /** Distinct cities for the selected state */
    availableCities?: string[]
  }>(),
  {
    idPrefix: 'dir-geo',
    showCountry: true,
    availableCountries: () => [],
    availableRegions: () => [],
    availableCities: () => [],
  },
)

const country = defineModel<string>('country', { default: '' })
const region = defineModel<string>('region', { default: '' })
const city = defineModel<string>('city', { default: '' })

const showState = computed(() => !props.showCountry || country.value === 'US')

const countryChoices = computed(() => {
  const codes = props.availableCountries.length
    ? props.availableCountries
    : COUNTRY_OPTIONS.map((c) => c.value)
  const opts = codes
    .map((code) => {
      const key = code.trim().toUpperCase()
      return { value: key, label: countryLabel(key) || key }
    })
    .filter((o) => o.value)
  opts.sort((a, b) => {
    if (a.value === 'US') return -1
    if (b.value === 'US') return 1
    return a.label.localeCompare(b.label)
  })
  return opts
})

const stateChoices = computed(() => {
  const codes = props.availableRegions.length
    ? props.availableRegions
    : US_STATE_OPTIONS.map((s) => s.value)
  return codes
    .map((code) => {
      const key = code.trim().toUpperCase()
      return { value: key, label: usStateLabel(key) || key }
    })
    .filter((o) => o.value)
    .sort((a, b) => a.label.localeCompare(b.label))
})

const cityChoices = computed(() => {
  return [...props.availableCities].filter(Boolean).sort((a, b) => a.localeCompare(b))
})

watch(country, (next, prev) => {
  if (prev === undefined || next === prev) return
  region.value = ''
  city.value = ''
})

watch(region, (next, prev) => {
  if (prev === undefined || next === prev) return
  city.value = ''
})

/** State/city-only mode implies US when a state or city filter is active. */
watch(
  [() => props.showCountry, region, city],
  () => {
    if (props.showCountry) return
    const next = region.value || city.value ? 'US' : ''
    if (country.value !== next) country.value = next
  },
  { immediate: true },
)
</script>

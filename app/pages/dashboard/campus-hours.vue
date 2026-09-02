<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="flex-1 min-w-0 overflow-y-auto">
      <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Campus Hours</h1>
          <p class="mt-1 text-sm text-gray-600">
            Kentucky campus week template and holiday/break exceptions. Duplicate a season for summer or a break week.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManageDashboard"
          class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm"
        >
          You do not have access to the dashboard admin panel. Access is limited to staff.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{{ error }}</div>
          <div v-if="success" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{{ success }}</div>

          <section class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label class="block min-w-0 flex-1">
                <span class="mb-1 block text-sm font-medium text-gray-700">Season</span>
                <select
                  v-model="selectedSeasonId"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  @change="loadSelectedSeason"
                >
                  <option value="">Select a season</option>
                  <option v-for="season in seasons" :key="season.id" :value="String(season.id)">
                    {{ season.name }} ({{ season.startDate }} – {{ season.endDate }})
                  </option>
                </select>
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  @click="startCreate"
                >
                  New season
                </button>
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  :disabled="!selectedSeasonId"
                  @click="startDuplicate"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  class="rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  :disabled="!selectedSeasonId"
                  @click="deleteSeason"
                >
                  Delete
                </button>
              </div>
            </div>
          </section>

          <form v-if="showSeasonForm" class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm" @submit.prevent="saveSeasonMeta">
            <h2 class="text-base font-semibold text-gray-900">
              {{ formMode === 'create' ? 'New season' : formMode === 'duplicate' ? 'Duplicate season' : 'Season details' }}
            </h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <input v-model="seasonForm.name" type="text" required placeholder="Name (e.g. Fall 2026)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <input v-model="seasonForm.startDate" type="date" required class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <input v-model="seasonForm.endDate" type="date" required class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <input
                v-model="seasonForm.note"
                type="text"
                placeholder="Footer note shown in the campus hours modal (optional)"
                class="sm:col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
            </div>
            <div class="mt-4 flex items-center gap-2">
              <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
                {{ formMode === 'edit' ? 'Save details' : formMode === 'duplicate' ? 'Create copy' : 'Create season' }}
              </button>
              <button
                v-if="formMode !== 'edit'"
                type="button"
                class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                @click="cancelSeasonForm"
              >
                Cancel
              </button>
            </div>
          </form>

          <section v-if="weekly" class="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <h2 class="text-base font-semibold text-gray-900">Typical week</h2>
              <button
                type="button"
                class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
                :disabled="savingWeekly || !selectedSeasonId"
                @click="saveWeekly"
              >
                {{ savingWeekly ? 'Saving…' : 'Save week' }}
              </button>
            </div>
            <p class="px-4 py-2 text-xs text-gray-500">
              Leave a cell blank when that facility is not listed. Type <span class="font-medium">closed</span> for a closed day.
            </p>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[48rem] border-collapse text-sm">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50">
                    <th class="px-3 py-2 text-left font-semibold text-gray-600"> </th>
                    <th
                      v-for="weekday in displayWeekdays"
                      :key="weekday"
                      class="px-2 py-2 text-center font-semibold text-gray-700"
                    >
                      {{ weekdayShortLabel(weekday) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="facility in facilities" :key="facility.key" class="border-b border-gray-100">
                    <th class="whitespace-nowrap px-3 py-2 text-left font-semibold text-gray-800">{{ facility.label }}</th>
                    <td v-for="weekday in displayWeekdays" :key="`${facility.key}-${weekday}`" class="px-1 py-1">
                      <input
                        v-model="weekly[String(weekday)][facility.key]"
                        type="text"
                        class="w-full min-w-[6.5rem] rounded border border-gray-200 px-2 py-1 text-center text-xs"
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 class="text-base font-semibold text-gray-900">Exceptions</h2>
            <p class="mt-1 text-sm text-gray-600">Holidays and one-off changes on top of the season week. A closed-all exception wins first; a facility override can reopen a building that day.</p>
            <form class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" @submit.prevent="addException">
              <input v-model="exceptionForm.date" type="date" required class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <select v-model="exceptionForm.facility" class="rounded-md border border-gray-300 px-3 py-2 text-sm" :disabled="exceptionForm.closedAll">
                <option value="">All facilities</option>
                <option v-for="facility in facilities" :key="facility.key" :value="facility.key">{{ facility.label }}</option>
              </select>
              <input
                v-model="exceptionForm.hours"
                type="text"
                placeholder="Hours or closed"
                class="rounded-md border border-gray-300 px-3 py-2 text-sm"
                :disabled="exceptionForm.closedAll"
              >
              <label class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
                <input v-model="exceptionForm.closedAll" type="checkbox">
                Closed all
              </label>
              <input v-model="exceptionForm.note" type="text" placeholder="Note (e.g. Labor Day)" class="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <button type="submit" class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]">
                Add exception
              </button>
            </form>

            <ul class="mt-4 divide-y divide-gray-100 rounded-md border border-gray-200">
              <li v-if="!exceptions.length" class="px-3 py-3 text-sm text-gray-500">No exceptions yet.</li>
              <li v-for="item in exceptions" :key="item.id" class="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <p class="font-medium text-gray-900">
                    {{ item.date }}
                    <span class="font-normal text-gray-500">
                      · {{ item.closedAll ? 'Closed all' : facilityLabel(item.facility) }}
                      <template v-if="!item.closedAll && item.hours"> · {{ item.hours }}</template>
                    </span>
                  </p>
                  <p v-if="item.note" class="text-xs text-gray-500">{{ item.note }}</p>
                </div>
                <button type="button" class="text-xs text-red-700 hover:underline" @click="deleteException(item.id)">
                  Remove
                </button>
              </li>
            </ul>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  CAMPUS_HOURS_DISPLAY_WEEKDAYS,
  CAMPUS_HOURS_FACILITIES,
  emptyWeeklyGrid,
  weekdayShortLabel,
} from '@shared/campusHours'

type Season = {
  id: number
  name: string
  startDate: string
  endDate: string
  note: string | null
  weekly?: Record<string, Record<string, string>>
}

type ExceptionRow = {
  id: number
  date: string
  facility: string | null
  hours: string | null
  closedAll: boolean
  note: string | null
}

const { data: me, pending: mePending } = await useFetch<any>('/api/users/me', {
  key: 'dashboard-campus-hours-me',
})

const canManageDashboard = computed(() => {
  const roles: string[] = Array.isArray(me.value?.roles) ? me.value.roles : []
  return roles.some((role) => String(role).toLowerCase() === 'staff')
})

const facilities = CAMPUS_HOURS_FACILITIES
const displayWeekdays = CAMPUS_HOURS_DISPLAY_WEEKDAYS
const error = ref('')
const success = ref('')
const seasons = ref<Season[]>([])
const selectedSeasonId = ref('')
const weekly = ref<Record<string, Record<string, string>> | null>(null)
const exceptions = ref<ExceptionRow[]>([])
const savingWeekly = ref(false)
const formMode = ref<'create' | 'edit' | 'duplicate' | ''>('')
const seasonForm = ref({ name: '', startDate: '', endDate: '', note: '' })
const exceptionForm = ref({ date: '', facility: '', hours: '', closedAll: false, note: '' })

const showSeasonForm = computed(() => formMode.value !== '')

function facilityLabel(key: string | null) {
  if (!key) return 'All facilities'
  return facilities.find((facility) => facility.key === key)?.label || key
}

function flash(message: string) {
  success.value = message
  error.value = ''
}

function fail(err: any, fallback: string) {
  error.value = err?.data?.error || err?.statusMessage || err?.message || fallback
  success.value = ''
}

async function loadSeasons() {
  const data = await $fetch<{ docs: Season[] }>('/api/dashboard/campus-hours/seasons')
  seasons.value = data.docs || []
}

async function loadExceptions() {
  const data = await $fetch<{ docs: ExceptionRow[] }>('/api/dashboard/campus-hours/exceptions')
  exceptions.value = data.docs || []
}

function applySeason(season: Season) {
  selectedSeasonId.value = String(season.id)
  formMode.value = 'edit'
  seasonForm.value = {
    name: season.name,
    startDate: season.startDate,
    endDate: season.endDate,
    note: season.note || '',
  }
  weekly.value = season.weekly ? structuredClone(season.weekly) : emptyWeeklyGrid()
}

async function loadSelectedSeason() {
  if (!selectedSeasonId.value) {
    weekly.value = null
    formMode.value = ''
    return
  }
  try {
    const season = await $fetch<Season>(`/api/dashboard/campus-hours/seasons/${selectedSeasonId.value}`)
    applySeason(season)
  } catch (err: any) {
    fail(err, 'Failed to load season')
  }
}

function startCreate() {
  selectedSeasonId.value = ''
  weekly.value = emptyWeeklyGrid()
  formMode.value = 'create'
  seasonForm.value = { name: '', startDate: '', endDate: '', note: '' }
}

function startDuplicate() {
  if (!selectedSeasonId.value || !weekly.value) return
  formMode.value = 'duplicate'
  seasonForm.value = {
    name: `${seasonForm.value.name} copy`,
    startDate: '',
    endDate: '',
    note: seasonForm.value.note,
  }
}

function cancelSeasonForm() {
  if (selectedSeasonId.value) loadSelectedSeason()
  else {
    formMode.value = ''
    weekly.value = null
  }
}

async function saveSeasonMeta() {
  try {
    if (formMode.value === 'create') {
      const created = await $fetch<Season>('/api/dashboard/campus-hours/seasons', {
        method: 'POST',
        body: { ...seasonForm.value, weekly: weekly.value },
      })
      await loadSeasons()
      applySeason(created)
      flash('Season created.')
      return
    }
    if (formMode.value === 'duplicate') {
      const copied = await $fetch<Season>(`/api/dashboard/campus-hours/seasons/${selectedSeasonId.value}/duplicate`, {
        method: 'POST',
        body: seasonForm.value,
      })
      await loadSeasons()
      applySeason(copied)
      flash('Season duplicated.')
      return
    }
    const updated = await $fetch<Season>(`/api/dashboard/campus-hours/seasons/${selectedSeasonId.value}`, {
      method: 'PATCH',
      body: seasonForm.value,
    })
    await loadSeasons()
    applySeason(updated)
    flash('Season details saved.')
  } catch (err: any) {
    fail(err, 'Failed to save season')
  }
}

async function saveWeekly() {
  if (!selectedSeasonId.value || !weekly.value) return
  savingWeekly.value = true
  try {
    const updated = await $fetch<Season>(`/api/dashboard/campus-hours/seasons/${selectedSeasonId.value}/weekly`, {
      method: 'PUT',
      body: { weekly: weekly.value },
    })
    applySeason(updated)
    flash('Typical week saved.')
  } catch (err: any) {
    fail(err, 'Failed to save week')
  } finally {
    savingWeekly.value = false
  }
}

async function deleteSeason() {
  if (!selectedSeasonId.value) return
  if (!window.confirm('Delete this season and its typical week? Exceptions are kept.')) return
  try {
    await $fetch(`/api/dashboard/campus-hours/seasons/${selectedSeasonId.value}`, { method: 'DELETE' })
    selectedSeasonId.value = ''
    weekly.value = null
    formMode.value = ''
    await loadSeasons()
    flash('Season deleted.')
  } catch (err: any) {
    fail(err, 'Failed to delete season')
  }
}

async function addException() {
  try {
    await $fetch('/api/dashboard/campus-hours/exceptions', {
      method: 'POST',
      body: {
        date: exceptionForm.value.date,
        facility: exceptionForm.value.closedAll ? '' : exceptionForm.value.facility,
        hours: exceptionForm.value.closedAll ? '' : exceptionForm.value.hours,
        closedAll: exceptionForm.value.closedAll,
        note: exceptionForm.value.note,
      },
    })
    exceptionForm.value = { date: '', facility: '', hours: '', closedAll: false, note: '' }
    await loadExceptions()
    flash('Exception added.')
  } catch (err: any) {
    fail(err, 'Failed to add exception')
  }
}

async function deleteException(id: number) {
  try {
    await $fetch(`/api/dashboard/campus-hours/exceptions/${id}`, { method: 'DELETE' })
    await loadExceptions()
    flash('Exception removed.')
  } catch (err: any) {
    fail(err, 'Failed to remove exception')
  }
}

watch(canManageDashboard, async (allowed) => {
  if (!allowed) return
  try {
    await Promise.all([loadSeasons(), loadExceptions()])
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const current = seasons.value.find((season) => season.startDate <= today && today <= season.endDate) || seasons.value[seasons.value.length - 1]
    if (current) {
      selectedSeasonId.value = String(current.id)
      await loadSelectedSeason()
    }
  } catch (err: any) {
    fail(err, 'Failed to load campus hours')
  }
}, { immediate: true })
</script>

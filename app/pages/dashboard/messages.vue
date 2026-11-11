<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Official Messages</h1>
          <p class="mt-1 max-w-2xl text-sm text-gray-600">
            Send a formatted announcement from an office account.
            <NuxtLink to="/dashboard/all-messages" class="text-[rgba(13,94,130,1)] hover:underline">All Messages</NuxtLink>
            lists, edits, and removes every conversation message.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManage"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Official Messages is limited to Connect admins.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {{ error }}
          </div>

          <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 class="text-base font-semibold text-gray-900">Send a message</h2>
            <p v-if="!loading && !accounts.length" class="mt-2 text-sm text-gray-600">
              Add an office account below before sending.
            </p>
            <template v-else>
              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <label class="block text-sm">
                  <span class="font-medium text-gray-900">From</span>
                  <select
                    v-model="senderId"
                    class="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option v-for="account in accounts" :key="account.id" :value="account.id">
                      {{ account.name }}
                    </option>
                  </select>
                </label>
                <fieldset>
                  <legend class="text-sm font-medium text-gray-900">Audience</legend>
                  <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                    <label v-for="audience in audiences" :key="audience.value" class="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input v-model="selectedAudiences" type="checkbox" :value="audience.value" />
                      {{ audience.label }}
                    </label>
                  </div>
                </fieldset>
              </div>
              <div class="mt-4">
                <OfficialMessageComposer ref="composer" />
              </div>
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                  :disabled="sending || !senderId || !selectedAudiences.length"
                  @click="sendMessage"
                >
                  {{ sending ? 'Sending…' : 'Send' }}
                </button>
                <p v-if="sentNote" class="text-sm text-gray-600">{{ sentNote }}</p>
              </div>
            </template>
          </section>

          <section class="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <label for="official-account-search" class="text-sm font-medium text-gray-900">Add an account</label>
            <input
              id="official-account-search"
              v-model="searchQuery"
              type="search"
              placeholder="Search name or email"
              class="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              @input="scheduleSearch"
            />
            <ul v-if="searchResults.length" class="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
              <li v-for="person in searchResults" :key="person.id" class="flex items-center gap-3 px-3 py-2">
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-gray-900">{{ person.name }}</span>
                  <span class="block truncate text-xs text-gray-500">{{ person.email }}</span>
                </span>
                <button
                  type="button"
                  class="shrink-0 rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
                  :disabled="savingId === person.id || listedIds.has(person.id)"
                  @click="addAccount(person)"
                >
                  {{ listedIds.has(person.id) ? 'Added' : 'Add' }}
                </button>
              </li>
            </ul>
          </section>

          <section class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <h2 class="border-b border-gray-200 px-4 py-3 text-base font-semibold text-gray-900">
              Official accounts
              <span class="ml-1 text-sm font-normal text-gray-500">({{ accounts.length }})</span>
            </h2>
            <p v-if="loading" class="px-4 py-4 text-sm text-gray-500">Loading accounts...</p>
            <p v-else-if="!accounts.length" class="px-4 py-4 text-sm text-gray-500">
              No office accounts yet.
            </p>
            <ul v-else class="divide-y divide-gray-100">
              <li v-for="account in accounts" :key="account.id" class="flex items-center gap-3 px-4 py-3">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
                  <img v-if="account.avatarUrl" :src="account.avatarUrl" alt="" class="h-full w-full object-cover" />
                  <span v-else>{{ initial(account.name) }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-gray-900">{{ account.name }}</span>
                  <span class="block truncate text-xs text-gray-500">{{ account.email }}</span>
                </span>
                <button
                  type="button"
                  class="shrink-0 text-sm text-red-700 hover:underline disabled:opacity-50"
                  :disabled="savingId === account.id"
                  @click="removeAccount(account)"
                >
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
import { messagePlainText } from '@shared/messageHtml'
import OfficialMessageComposer from '~/components/dashboard/OfficialMessageComposer.vue'

type OfficialAccount = {
  id: number
  name: string
  email: string
  avatarUrl: string | null
}

type SearchPerson = {
  id: number
  name: string
  email: string
}

const { mePending, canAccessSection } = useDashboardAccess()
const canManage = computed(() => canAccessSection('messages'))

const accounts = ref<OfficialAccount[]>([])
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const searchResults = ref<SearchPerson[]>([])
const savingId = ref<number | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const listedIds = computed(() => new Set(accounts.value.map((account) => account.id)))
const audiences = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' },
  { value: 'students', label: 'Students' },
]
const senderId = ref<number | null>(null)
const selectedAudiences = ref<string[]>([])
const composer = ref<{ htmlForSend: () => string; clear: () => void } | null>(null)
const sending = ref(false)
const sentNote = ref('')

watch(accounts, (list) => {
  if (!list.some((account) => account.id === senderId.value)) senderId.value = list[0]?.id ?? null
})

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function errorText(err: any, fallback: string) {
  return err?.data?.statusMessage || err?.statusMessage || err?.data?.message || err?.message || fallback
}

async function loadAccounts() {
  if (!canManage.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ docs: OfficialAccount[] }>('/api/dashboard/official-senders')
    accounts.value = Array.isArray(data?.docs) ? data.docs : []
  } catch (err: any) {
    error.value = errorText(err, 'Failed to load official accounts.')
  } finally {
    loading.value = false
  }
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  const query = searchQuery.value.trim()
  if (!query) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(() => {
    void runSearch(query)
  }, 250)
}

async function runSearch(query: string) {
  try {
    const data = await $fetch<{ docs: SearchPerson[] }>('/api/users/search', { query: { q: query } })
    searchResults.value = Array.isArray(data?.docs) ? data.docs : []
  } catch (err: any) {
    error.value = errorText(err, 'Failed to search people.')
  }
}

async function addAccount(person: SearchPerson) {
  savingId.value = person.id
  error.value = ''
  try {
    await $fetch('/api/dashboard/official-senders', { method: 'POST', body: { userId: person.id } })
    if (!accounts.value.some((account) => account.id === person.id)) {
      accounts.value = [...accounts.value, { id: person.id, name: person.name, email: person.email, avatarUrl: null }]
    }
    searchQuery.value = ''
    searchResults.value = []
    await loadAccounts()
  } catch (err: any) {
    error.value = errorText(err, 'Failed to add official account.')
  } finally {
    savingId.value = null
  }
}

async function sendMessage() {
  const html = composer.value?.htmlForSend() || ''
  if (!messagePlainText(html)) {
    error.value = 'Write a message before sending.'
    return
  }
  if (!senderId.value || !selectedAudiences.value.length) return
  sending.value = true
  error.value = ''
  sentNote.value = ''
  try {
    const result = await $fetch<{ sent: number }>('/api/dashboard/official-messages', {
      method: 'POST',
      body: { senderId: senderId.value, audiences: selectedAudiences.value, html },
    })
    composer.value?.clear()
    const count = Number(result?.sent) || selectedAudiences.value.length
    sentNote.value = count === 1 ? 'Sent to 1 channel.' : `Sent to ${count} channels.`
  } catch (err: any) {
    error.value = errorText(err, 'Failed to send official message.')
  } finally {
    sending.value = false
  }
}

async function removeAccount(account: OfficialAccount) {
  savingId.value = account.id
  error.value = ''
  try {
    await $fetch(`/api/dashboard/official-senders/${account.id}`, { method: 'DELETE' })
    accounts.value = accounts.value.filter((item) => item.id !== account.id)
  } catch (err: any) {
    error.value = errorText(err, 'Failed to remove official account.')
  } finally {
    savingId.value = null
  }
}

watch(canManage, () => {
  void loadAccounts()
}, { immediate: true })

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

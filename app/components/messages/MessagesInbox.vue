<template>
  <aside class="flex h-full min-h-0 w-full flex-col bg-white">
    <div class="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-3">
      <h1 class="text-base font-semibold text-gray-900">Messages</h1>
      <button
        type="button"
        class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)]"
        @click="toggleComposer"
      >
        {{ composerOpen ? 'Close' : 'New' }}
      </button>
    </div>

    <form v-if="composerOpen" class="space-y-2 border-b border-gray-200 px-3 py-3" @submit.prevent>
      <div class="flex gap-2 text-sm">
        <button
          type="button"
          class="rounded-md px-2 py-1"
          :class="mode === 'dm' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'"
          @click="mode = 'dm'"
        >
          Direct
        </button>
        <button
          type="button"
          class="rounded-md px-2 py-1"
          :class="mode === 'group' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'"
          @click="mode = 'group'"
        >
          Group
        </button>
      </div>
      <input
        v-if="mode === 'group'"
        v-model="groupTitle"
        type="text"
        maxlength="80"
        placeholder="Group name"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search people"
        class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        @input="scheduleSearch"
      />
      <p v-if="composerError" class="text-sm text-red-600">{{ composerError }}</p>
      <ul v-if="searchResults.length" class="max-h-40 overflow-y-auto rounded-md border border-gray-200">
        <li v-for="person in searchResults" :key="person.id">
          <button
            type="button"
            class="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-gray-50"
            @click="choosePerson(person)"
          >
            <span class="min-w-0 flex-1 truncate">{{ person.name }}</span>
            <span class="shrink-0 text-xs text-gray-500">{{ mode === 'group' ? 'Add' : 'Message' }}</span>
          </button>
        </li>
      </ul>
      <div v-if="mode === 'group' && selectedPeople.length" class="flex flex-wrap gap-1">
        <button
          v-for="person in selectedPeople"
          :key="person.id"
          type="button"
          class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800"
          @click="selectedPeople = selectedPeople.filter((item) => item.id !== person.id)"
        >
          {{ person.name }} ×
        </button>
      </div>
      <button
        v-if="mode === 'group'"
        type="button"
        class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        :disabled="creating || selectedPeople.length === 0 || !groupTitle.trim()"
        @click="createGroup"
      >
        Create group
      </button>
    </form>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <p v-if="loadError && !conversations.length" class="px-3 py-4 text-sm text-red-600">{{ loadError }}</p>
      <p v-else-if="pending && !conversations.length && !activeId" class="px-3 py-4 text-sm text-gray-500">Loading conversations…</p>
      <template v-else-if="!pending || conversations.length">
      <section v-for="section in inboxSections" :key="section.key">
        <button
          type="button"
          class="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left"
          :aria-expanded="section.open"
          @click="section.toggle"
        >
          <UIcon
            name="i-lucide-chevron-right"
            class="h-4 w-4 shrink-0 text-gray-500 transition-transform"
            :class="section.open ? 'rotate-90' : ''"
          />
          <span class="text-xs font-semibold uppercase tracking-wide text-gray-700">{{ section.label }}</span>
          <span v-if="section.unread" class="h-2 w-2 rounded-full bg-red-500" aria-label="Unread" />
          <span class="ml-auto text-xs text-gray-500">{{ section.items.length }}</span>
        </button>
        <div v-show="section.open">
          <p v-if="!section.items.length" class="px-3 py-4 text-sm text-gray-500">{{ section.empty }}</p>
          <NuxtLink
            v-for="conversation in section.items"
            :key="conversation.id"
            :to="`/messages/${conversation.id}`"
            no-prefetch
            class="flex items-start gap-3 border-b border-gray-100 px-3 py-3 hover:bg-gray-50"
            :class="conversation.id === activeId ? 'bg-sky-50' : ''"
            :aria-current="conversation.id === activeId ? 'page' : undefined"
          >
            <span class="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
              <img v-if="conversation.avatarUrl" :src="conversation.avatarUrl" alt="" class="h-full w-full object-cover" />
              <span v-else>{{ initial(conversation.label) }}</span>
              <span v-if="conversation.unread" class="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-baseline justify-between gap-2">
                <span class="truncate text-sm font-medium text-gray-900" :class="conversation.unread ? 'font-semibold' : ''">
                  {{ conversation.label }}
                </span>
                <span class="shrink-0 text-[11px] text-gray-500">{{ formatWhen(conversation.lastMessageAt) }}</span>
              </span>
              <span class="mt-0.5 block truncate text-xs text-gray-600">
                {{ conversation.lastMessagePreview || (conversation.type === 'channel' ? 'Official posts will show up here' : 'No messages yet') }}
              </span>
            </span>
          </NuxtLink>
        </div>
      </section>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ConversationSummary } from '~/utils/messagesApi'
import { messageError } from '~/utils/messagesApi'

const props = defineProps<{
  activeId?: number | null
}>()

type SearchPerson = { id: number; name: string; avatar: string | null }

const { currentUserId } = useMe()
const conversations = ref<ConversationSummary[]>([])
const pending = ref(true)
const loadError = ref('')
const composerOpen = ref(false)
const mode = ref<'dm' | 'group'>('dm')
const searchQuery = ref('')
const searchResults = ref<SearchPerson[]>([])
const selectedPeople = ref<SearchPerson[]>([])
const groupTitle = ref('')
const composerError = ref('')
const creating = ref(false)
const officialOpen = ref(true)
const chatOpen = ref(true)

const hiddenChannelAudiences = new Set(['all', 'employees', 'staff'])

function isHiddenChannel(conversation: ConversationSummary) {
  return conversation.type === 'channel' && hiddenChannelAudiences.has(conversation.audience || '')
}

function isOfficialConversation(conversation: ConversationSummary) {
  return conversation.official === true
}

const inboxSections = computed(() => {
  const listed = conversations.value.filter((conversation) => !isHiddenChannel(conversation))
  const official = listed.filter((conversation) => isOfficialConversation(conversation))
  const chat = listed.filter((conversation) => !isOfficialConversation(conversation))
  return [
    {
      key: 'official',
      label: 'Official',
      empty: 'No official messages yet.',
      open: officialOpen.value,
      toggle: () => {
        officialOpen.value = !officialOpen.value
      },
      unread: official.some((conversation) => conversation.unread),
      items: official,
    },
    {
      key: 'chat',
      label: 'Chat',
      empty: 'No chats yet. Start a direct message or a group.',
      open: chatOpen.value,
      toggle: () => {
        chatOpen.value = !chatOpen.value
      },
      unread: chat.some((conversation) => conversation.unread),
      items: chat,
    },
  ]
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function initial(label: string) {
  return label.trim().charAt(0).toUpperCase() || '?'
}

function formatWhen(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

async function loadConversations() {
  if (import.meta.client && document.visibilityState === 'hidden') return
  try {
    const data = await $fetch<{ docs: ConversationSummary[] }>('/api/messages/conversations', {
      query: { limit: 30 },
    })
    conversations.value = Array.isArray(data?.docs) ? data.docs : []
    loadError.value = ''
  } catch (err) {
    if (!conversations.value.length) loadError.value = messageError(err)
  } finally {
    pending.value = false
  }
}

function toggleComposer() {
  composerOpen.value = !composerOpen.value
  composerError.value = ''
  searchResults.value = []
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
    const me = currentUserId.value
    searchResults.value = (data?.docs ?? []).filter((person) => person.id !== me)
  } catch (err) {
    composerError.value = messageError(err)
  }
}

async function choosePerson(person: SearchPerson) {
  composerError.value = ''
  if (mode.value === 'group') {
    if (!selectedPeople.value.some((item) => item.id === person.id)) selectedPeople.value.push(person)
    searchQuery.value = ''
    searchResults.value = []
    return
  }
  creating.value = true
  try {
    const created = await $fetch<ConversationSummary>('/api/messages/conversations', {
      method: 'POST',
      body: { type: 'dm', userId: person.id },
    })
    await navigateTo(`/messages/${created.id}`)
  } catch (err) {
    composerError.value = messageError(err)
  } finally {
    creating.value = false
  }
}

async function createGroup() {
  composerError.value = ''
  creating.value = true
  try {
    const created = await $fetch<ConversationSummary>('/api/messages/conversations', {
      method: 'POST',
      body: {
        type: 'group',
        title: groupTitle.value.trim(),
        memberIds: selectedPeople.value.map((person) => person.id),
      },
    })
    await navigateTo(`/messages/${created.id}`)
  } catch (err) {
    composerError.value = messageError(err)
  } finally {
    creating.value = false
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') void loadConversations()
}

onMounted(() => {
  void loadConversations()
  pollTimer = setInterval(() => {
    void loadConversations()
  }, 8000)
  document.addEventListener('visibilitychange', onVisible)
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisible)
})

watch(
  () => props.activeId,
  () => {
    void loadConversations()
  },
)
</script>

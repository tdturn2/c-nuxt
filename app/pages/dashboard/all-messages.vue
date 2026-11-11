<template>
  <div class="flex min-h-0 bg-gray-50">
    <DashboardSidebar />
    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">All Messages</h1>
          <p class="mt-1 max-w-2xl text-sm text-gray-600">
            Create, edit, and remove messages in any conversation. HTML is kept when the body includes tags.
          </p>
        </div>

        <div v-if="mePending" class="py-8 text-gray-500">Checking access...</div>
        <div
          v-else-if="!canManage"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          All Messages is limited to Connect admins.
        </div>

        <template v-else>
          <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {{ error }}
          </div>

          <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 class="text-base font-semibold text-gray-900">New message</h2>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="text-sm font-medium text-gray-900" for="all-messages-conversation">Conversation</label>
                <input
                  id="all-messages-conversation"
                  v-model="conversationQuery"
                  type="search"
                  placeholder="Search by name or id"
                  class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  @input="scheduleConversationSearch"
                />
                <p v-if="selectedConversation" class="mt-2 text-sm text-gray-700">
                  {{ selectedConversation.label }}
                  <button type="button" class="ml-2 text-[rgba(13,94,130,1)] hover:underline" @click="selectedConversation = null">
                    Change
                  </button>
                </p>
                <ul v-else-if="conversationResults.length" class="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
                  <li v-for="conversation in conversationResults" :key="conversation.id">
                    <button
                      type="button"
                      class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      @click="chooseConversation(conversation)"
                    >
                      <span class="truncate">{{ conversation.label }}</span>
                      <span class="shrink-0 text-xs uppercase text-gray-500">{{ conversation.type }}</span>
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-900" for="all-messages-sender">Sender</label>
                <input
                  id="all-messages-sender"
                  v-model="senderQuery"
                  type="search"
                  placeholder="Optional. Search name or email"
                  class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  @input="scheduleSenderSearch"
                />
                <p v-if="selectedSender" class="mt-2 text-sm text-gray-700">
                  {{ selectedSender.name }}
                  <button type="button" class="ml-2 text-[rgba(13,94,130,1)] hover:underline" @click="selectedSender = null">
                    Clear
                  </button>
                </p>
                <ul v-else-if="senderResults.length" class="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
                  <li v-for="person in senderResults" :key="person.id">
                    <button
                      type="button"
                      class="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      @click="chooseSender(person)"
                    >
                      <span class="block truncate">{{ person.name }}</span>
                      <span class="block truncate text-xs text-gray-500">{{ person.email }}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div class="mt-4">
              <label class="text-sm font-medium text-gray-900" for="all-messages-kind">Kind</label>
              <select id="all-messages-kind" v-model="kind" class="mt-1 w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="user">Message</option>
                <option value="official">Official</option>
                <option value="system">System</option>
              </select>
            </div>
            <label class="mt-4 block text-sm font-medium text-gray-900" for="all-messages-body">Body</label>
            <textarea
              id="all-messages-body"
              v-model="draft"
              rows="6"
              class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Write a message, or paste HTML"
            />
            <button
              type="button"
              class="mt-3 rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white hover:bg-[rgba(10,69,92,1)] disabled:opacity-50"
              :disabled="saving || !selectedConversation || !draft.trim()"
              @click="createMessage"
            >
              {{ saving ? 'Saving…' : 'Create' }}
            </button>
          </section>

          <section class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div class="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
              <h2 class="text-base font-semibold text-gray-900">
                Messages
                <span class="ml-1 text-sm font-normal text-gray-500">({{ total }})</span>
              </h2>
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Search message text"
                class="ml-auto w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
                @input="scheduleListSearch"
              />
            </div>
            <p v-if="loading" class="px-4 py-4 text-sm text-gray-500">Loading messages...</p>
            <p v-else-if="!docs.length" class="px-4 py-4 text-sm text-gray-500">No messages found.</p>
            <ul v-else class="divide-y divide-gray-100">
              <li v-for="message in docs" :key="message.id" class="px-4 py-3">
                <div class="flex flex-wrap items-start gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">
                      {{ message.conversationLabel }}
                      <span class="ml-2 text-xs font-normal uppercase text-gray-500">{{ message.kind }}</span>
                      <span v-if="message.deleted" class="ml-2 text-xs font-normal text-red-700">Removed</span>
                    </p>
                    <p class="truncate text-xs text-gray-500">
                      {{ message.sender?.name || 'No sender' }}
                      <span v-if="message.sender?.email"> · {{ message.sender.email }}</span>
                      · {{ formatWhen(message.createdAt) }}
                    </p>
                    <p v-if="editingId !== message.id" class="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                      {{ message.preview || 'Empty message' }}
                    </p>
                  </div>
                  <div class="flex shrink-0 gap-3">
                    <button type="button" class="text-sm text-[rgba(13,94,130,1)] hover:underline" @click="startEdit(message)">
                      Edit
                    </button>
                    <button
                      v-if="!message.deleted"
                      type="button"
                      class="text-sm text-red-700 hover:underline disabled:opacity-50"
                      :disabled="savingId === message.id"
                      @click="removeMessage(message)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div v-if="editingId === message.id" class="mt-3">
                  <textarea v-model="editBody" rows="6" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  <div class="mt-2 flex gap-2">
                    <button
                      type="button"
                      class="rounded-md bg-[rgba(13,94,130,1)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      :disabled="savingId === message.id || !editBody.trim()"
                      @click="saveEdit(message)"
                    >
                      {{ savingId === message.id ? 'Saving…' : 'Save' }}
                    </button>
                    <button type="button" class="rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100" @click="editingId = null">
                      Cancel
                    </button>
                  </div>
                </div>
              </li>
            </ul>
            <div v-if="total > limit" class="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm">
              <button type="button" class="text-[rgba(13,94,130,1)] hover:underline disabled:opacity-40" :disabled="page <= 1 || loading" @click="goPage(page - 1)">
                Newer
              </button>
              <span class="text-gray-500">Page {{ page }}</span>
              <button
                type="button"
                class="text-[rgba(13,94,130,1)] hover:underline disabled:opacity-40"
                :disabled="page * limit >= total || loading"
                @click="goPage(page + 1)"
              >
                Older
              </button>
            </div>
          </section>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
type MessageDoc = {
  id: number
  conversationId: number
  conversationLabel: string
  conversationType: 'dm' | 'group' | 'channel'
  sender: { id: number; name: string; email: string | null } | null
  kind: 'user' | 'official' | 'system'
  body: string
  preview: string
  deleted: boolean
  createdAt: string
}

type ConversationOption = { id: number; type: 'dm' | 'group' | 'channel'; label: string }
type SearchPerson = { id: number; name: string; email: string }

const { mePending, canAccessSection } = useDashboardAccess()
const canManage = computed(() => canAccessSection('messages'))

const docs = ref<MessageDoc[]>([])
const total = ref(0)
const page = ref(1)
const limit = 25
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')
const saving = ref(false)
const savingId = ref<number | null>(null)
const editingId = ref<number | null>(null)
const editBody = ref('')

const conversationQuery = ref('')
const conversationResults = ref<ConversationOption[]>([])
const selectedConversation = ref<ConversationOption | null>(null)
const senderQuery = ref('')
const senderResults = ref<SearchPerson[]>([])
const selectedSender = ref<SearchPerson | null>(null)
const kind = ref<'user' | 'official' | 'system'>('user')
const draft = ref('')

let listTimer: ReturnType<typeof setTimeout> | null = null
let conversationTimer: ReturnType<typeof setTimeout> | null = null
let senderTimer: ReturnType<typeof setTimeout> | null = null

function errorText(err: any, fallback: string) {
  return err?.data?.statusMessage || err?.statusMessage || err?.data?.message || err?.data?.error || err?.message || fallback
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

async function loadMessages() {
  if (!canManage.value) return
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<{ docs: MessageDoc[]; total: number }>('/api/dashboard/all-messages', {
      query: { page: page.value, q: searchQuery.value.trim() },
    })
    docs.value = Array.isArray(data?.docs) ? data.docs : []
    total.value = Number(data?.total) || 0
  } catch (err: any) {
    error.value = errorText(err, 'Failed to load messages.')
  } finally {
    loading.value = false
  }
}

function scheduleListSearch() {
  if (listTimer) clearTimeout(listTimer)
  listTimer = setTimeout(() => {
    page.value = 1
    void loadMessages()
  }, 250)
}

function goPage(next: number) {
  page.value = next
  void loadMessages()
}

function scheduleConversationSearch() {
  if (conversationTimer) clearTimeout(conversationTimer)
  const query = conversationQuery.value.trim()
  conversationTimer = setTimeout(() => {
    void searchConversations(query)
  }, 250)
}

async function searchConversations(query: string) {
  try {
    const data = await $fetch<{ docs: ConversationOption[] }>('/api/dashboard/all-messages/conversations', {
      query: { q: query },
    })
    conversationResults.value = Array.isArray(data?.docs) ? data.docs : []
  } catch (err: any) {
    error.value = errorText(err, 'Failed to search conversations.')
  }
}

function chooseConversation(conversation: ConversationOption) {
  selectedConversation.value = conversation
  conversationQuery.value = ''
  conversationResults.value = []
}

function scheduleSenderSearch() {
  if (senderTimer) clearTimeout(senderTimer)
  const query = senderQuery.value.trim()
  if (!query) {
    senderResults.value = []
    return
  }
  senderTimer = setTimeout(() => {
    void searchSenders(query)
  }, 250)
}

async function searchSenders(query: string) {
  try {
    const data = await $fetch<{ docs: SearchPerson[] }>('/api/users/search', { query: { q: query } })
    senderResults.value = Array.isArray(data?.docs) ? data.docs : []
  } catch (err: any) {
    error.value = errorText(err, 'Failed to search people.')
  }
}

function chooseSender(person: SearchPerson) {
  selectedSender.value = person
  senderQuery.value = ''
  senderResults.value = []
}

async function createMessage() {
  if (!selectedConversation.value || !draft.value.trim()) return
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/dashboard/all-messages', {
      method: 'POST',
      body: {
        conversationId: selectedConversation.value.id,
        senderId: selectedSender.value?.id ?? null,
        kind: kind.value,
        body: draft.value,
      },
    })
    draft.value = ''
    page.value = 1
    await loadMessages()
  } catch (err: any) {
    error.value = errorText(err, 'Failed to create message.')
  } finally {
    saving.value = false
  }
}

function startEdit(message: MessageDoc) {
  editingId.value = message.id
  editBody.value = message.body
}

async function saveEdit(message: MessageDoc) {
  savingId.value = message.id
  error.value = ''
  try {
    const result = await $fetch<{ doc: MessageDoc }>(`/api/dashboard/all-messages/${message.id}`, {
      method: 'PATCH',
      body: { body: editBody.value },
    })
    const doc = result?.doc
    if (doc) docs.value = docs.value.map((item) => (item.id === doc.id ? doc : item))
    editingId.value = null
  } catch (err: any) {
    error.value = errorText(err, 'Failed to update message.')
  } finally {
    savingId.value = null
  }
}

async function removeMessage(message: MessageDoc) {
  if (!window.confirm(`Remove this message from ${message.conversationLabel}?`)) return
  savingId.value = message.id
  error.value = ''
  try {
    await $fetch(`/api/dashboard/all-messages/${message.id}`, { method: 'DELETE' })
    docs.value = docs.value.map((item) => (item.id === message.id ? { ...item, deleted: true, preview: item.preview } : item))
  } catch (err: any) {
    error.value = errorText(err, 'Failed to delete message.')
  } finally {
    savingId.value = null
  }
}

watch(canManage, (allowed) => {
  if (allowed) void loadMessages()
}, { immediate: true })
</script>

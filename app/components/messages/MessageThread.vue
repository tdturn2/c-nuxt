<template>
  <section class="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-gray-50">
    <header class="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-3">
      <NuxtLink
        to="/messages"
        class="rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 md:hidden"
        no-prefetch
      >
        Back
      </NuxtLink>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-base font-semibold text-gray-900">{{ conversation?.label || 'Conversation' }}</h1>
        <p v-if="conversation?.type === 'group'" class="text-xs text-gray-500">{{ conversation.memberCount }} people</p>
        <p v-else-if="conversation?.type === 'channel'" class="text-xs text-gray-500">Official posts</p>
      </div>
      <button
        v-if="conversation?.type === 'group'"
        type="button"
        class="rounded-md px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
        @click="peopleOpen = !peopleOpen"
      >
        People
      </button>
    </header>

    <div v-if="peopleOpen && conversation?.type === 'group'" class="border-b border-gray-200 bg-white px-3 py-3">
      <ul class="space-y-1">
        <li v-for="member in conversation.members" :key="member.id" class="flex items-center justify-between gap-2 text-sm">
          <span class="truncate">{{ member.name }}<span v-if="member.role === 'owner'" class="text-gray-500"> · owner</span></span>
          <button
            v-if="canManage && member.id !== meId && member.role !== 'owner'"
            type="button"
            class="shrink-0 text-xs text-red-700 hover:underline"
            @click="removePerson(member.id)"
          >
            Remove
          </button>
        </li>
      </ul>
      <form v-if="canManage" class="mt-3 space-y-2" @submit.prevent>
        <input
          v-model="memberQuery"
          type="search"
          placeholder="Add a person"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          @input="scheduleMemberSearch"
        />
        <ul v-if="memberResults.length" class="max-h-32 overflow-y-auto rounded-md border border-gray-200">
          <li v-for="person in memberResults" :key="person.id">
            <button type="button" class="w-full px-2 py-2 text-left text-sm hover:bg-gray-50" @click="addPerson(person.id)">
              {{ person.name }}
            </button>
          </li>
        </ul>
      </form>
      <button type="button" class="mt-3 text-sm text-gray-700 hover:underline" @click="leaveGroup">Leave group</button>
      <p v-if="peopleError" class="mt-2 text-sm text-red-600">{{ peopleError }}</p>
    </div>

    <div ref="scroller" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4">
      <div v-if="hasMore" class="text-center">
        <button type="button" class="text-sm text-[rgba(13,94,130,1)] hover:underline" @click="loadOlder">
          Earlier messages
        </button>
      </div>
      <p v-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>
      <p v-else-if="pending" class="text-sm text-gray-500">Loading messages…</p>
      <p v-else-if="!messages.length" class="text-sm text-gray-500">
        {{ conversation?.type === 'channel' ? 'Official posts will show up here.' : 'No messages yet.' }}
      </p>
      <article
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="messageClass(message)"
      >
        <div
          class="rounded-2xl px-3 py-2 text-sm"
          :class="[
            isRichMessage(message.body) && !message.deleted ? 'w-full max-w-full' : 'max-w-[85%]',
            bubbleClass(message),
          ]"
        >
          <p v-if="showSender(message)" class="mb-0.5 text-xs font-medium text-gray-500">{{ message.sender?.name }}</p>
          <p v-if="message.kind === 'official'" class="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-[rgba(13,94,130,1)]">
            Official
          </p>
          <p v-if="message.deleted" class="whitespace-pre-wrap break-words">This message was removed</p>
          <div
            v-else-if="isRichMessage(message.body)"
            class="official-message-html break-words"
            v-html="sanitizeMessageHtml(message.body)"
          />
          <p v-else class="whitespace-pre-wrap break-words">{{ message.body }}</p>
          <p
            class="mt-1 text-[11px]"
            :class="message.kind === 'user' && message.sender?.id === meId ? 'text-white/75' : 'text-gray-500'"
          >
            {{ formatWhen(message.createdAt) }}
          </p>
        </div>
      </article>
    </div>

    <form v-if="conversation && conversation.type !== 'channel'" class="border-t border-gray-200 bg-white p-3" @submit.prevent="send">
      <div class="flex items-end gap-2">
        <textarea
          v-model="draft"
          rows="2"
          maxlength="4000"
          placeholder="Write a message"
          class="min-h-[2.75rem] flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
          @keydown.enter.exact.prevent="send"
        />
        <button
          type="submit"
          class="rounded-md bg-[rgba(13,94,130,1)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          :disabled="sending || !draft.trim()"
        >
          Send
        </button>
      </div>
      <p v-if="sendError" class="mt-2 text-sm text-red-600">{{ sendError }}</p>
    </form>
    <p v-else-if="conversation?.type === 'channel'" class="border-t border-gray-200 bg-white px-3 py-3 text-sm text-gray-600">
      Official posts published on the timeline show up in this channel.
    </p>
  </section>
</template>

<script setup lang="ts">
import { isRichMessage, sanitizeMessageHtml } from '@shared/messageHtml'
import type { ChatMessage, ConversationSummary } from '~/utils/messagesApi'
import { messageError } from '~/utils/messagesApi'

const props = defineProps<{
  conversationId: number
}>()

const { currentUserId } = useMe()
const { refresh: refreshUnread } = useMessageUnread()
const conversation = ref<ConversationSummary | null>(null)
const messages = ref<ChatMessage[]>([])
const hasMore = ref(false)
const pending = ref(true)
const loadError = ref('')
const draft = ref('')
const sending = ref(false)
const sendError = ref('')
const peopleOpen = ref(false)
const peopleError = ref('')
const memberQuery = ref('')
const memberResults = ref<Array<{ id: number; name: string }>>([])
const scroller = ref<HTMLElement | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
let searchTimer: ReturnType<typeof setTimeout> | null = null

const meId = computed(() => currentUserId.value ?? null)
const canManage = computed(() => conversation.value?.myRole === 'owner' || conversation.value?.myRole === 'admin')

function formatWhen(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function messageClass(message: ChatMessage) {
  if (message.kind === 'system') return 'justify-center'
  if (message.sender && message.sender.id === meId.value) return 'justify-end'
  return 'justify-start'
}

function bubbleClass(message: ChatMessage) {
  if (message.kind === 'system') return 'bg-transparent px-0 text-center text-xs text-gray-500 shadow-none'
  if (message.kind === 'official') return 'bg-white text-gray-900 shadow-sm ring-1 ring-sky-100'
  if (message.sender && message.sender.id === meId.value) return 'bg-[rgba(13,94,130,1)] text-white'
  return 'bg-white text-gray-900 shadow-sm'
}

function showSender(message: ChatMessage) {
  return conversation.value?.type === 'group' && message.kind === 'user' && message.sender?.id !== meId.value
}

function nearBottom() {
  const el = scroller.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

async function scrollToBottom() {
  await nextTick()
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
}

async function markRead(messageId?: number) {
  if (!Number.isFinite(props.conversationId)) return
  try {
    await $fetch(`/api/messages/conversations/${props.conversationId}/read`, {
      method: 'POST',
      body: messageId ? { messageId } : {},
    })
    await refreshUnread()
  } catch {
    // Reading is best-effort; the next open will retry.
  }
}

async function loadConversation() {
  conversation.value = await $fetch<ConversationSummary>(`/api/messages/conversations/${props.conversationId}`)
}

async function loadLatest() {
  const page = await $fetch<{ messages: ChatMessage[]; hasMore: boolean }>(
    `/api/messages/conversations/${props.conversationId}/messages`,
  )
  messages.value = page.messages ?? []
  hasMore.value = Boolean(page.hasMore)
  const last = messages.value[messages.value.length - 1]
  if (last && document.visibilityState !== 'hidden') await markRead(last.id)
  await scrollToBottom()
}

async function loadOlder() {
  const first = messages.value[0]
  if (!first) return
  const stick = scroller.value
  const previousHeight = stick?.scrollHeight ?? 0
  const page = await $fetch<{ messages: ChatMessage[]; hasMore: boolean }>(
    `/api/messages/conversations/${props.conversationId}/messages`,
    { query: { before: first.id } },
  )
  messages.value = [...(page.messages ?? []), ...messages.value]
  hasMore.value = Boolean(page.hasMore)
  await nextTick()
  if (stick) stick.scrollTop += stick.scrollHeight - previousHeight
}

async function pollNew() {
  if (document.visibilityState === 'hidden') return
  const last = messages.value[messages.value.length - 1]
  if (!last) return
  const stick = nearBottom()
  try {
    const page = await $fetch<{ messages: ChatMessage[] }>(
      `/api/messages/conversations/${props.conversationId}/messages`,
      { query: { after: last.id } },
    )
    const incoming = page.messages ?? []
    if (!incoming.length) return
    messages.value = [...messages.value, ...incoming]
    const newest = incoming[incoming.length - 1]
    if (newest && document.visibilityState !== 'hidden') await markRead(newest.id)
    if (stick) await scrollToBottom()
  } catch {
    // The next poll retries.
  }
}

async function openThread() {
  if (!Number.isFinite(props.conversationId) || props.conversationId < 1) {
    loadError.value = 'Conversation not found'
    pending.value = false
    return
  }
  pending.value = true
  loadError.value = ''
  peopleOpen.value = false
  try {
    await Promise.all([loadConversation(), loadLatest()])
  } catch (err) {
    loadError.value = messageError(err)
    conversation.value = null
    messages.value = []
  } finally {
    pending.value = false
  }
}

async function send() {
  const body = draft.value.trim()
  if (!body || sending.value) return
  sending.value = true
  sendError.value = ''
  try {
    const result = await $fetch<{ message: ChatMessage }>(`/api/messages/conversations/${props.conversationId}/messages`, {
      method: 'POST',
      body: { body },
    })
    draft.value = ''
    if (result?.message && !messages.value.some((message) => message.id === result.message.id)) {
      messages.value = [...messages.value, result.message]
    }
    await scrollToBottom()
    await refreshUnread()
  } catch (err) {
    sendError.value = messageError(err)
  } finally {
    sending.value = false
  }
}

function scheduleMemberSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  const query = memberQuery.value.trim()
  if (!query) {
    memberResults.value = []
    return
  }
  searchTimer = setTimeout(() => {
    void searchMembers(query)
  }, 250)
}

async function searchMembers(query: string) {
  try {
    const data = await $fetch<{ docs: Array<{ id: number; name: string }> }>('/api/users/search', { query: { q: query } })
    const existing = new Set((conversation.value?.members ?? []).map((member) => member.id))
    memberResults.value = (data.docs ?? []).filter((person) => !existing.has(person.id))
  } catch (err) {
    peopleError.value = messageError(err)
  }
}

async function addPerson(userId: number) {
  peopleError.value = ''
  try {
    conversation.value = await $fetch<ConversationSummary>(`/api/messages/conversations/${props.conversationId}/members`, {
      method: 'POST',
      body: { userId },
    })
    memberQuery.value = ''
    memberResults.value = []
    await pollNew()
  } catch (err) {
    peopleError.value = messageError(err)
  }
}

async function removePerson(userId: number) {
  peopleError.value = ''
  try {
    const result = await $fetch<ConversationSummary | { ok: true }>(
      `/api/messages/conversations/${props.conversationId}/members/${userId}`,
      { method: 'DELETE' },
    )
    if (result && 'id' in result) conversation.value = result
    await pollNew()
  } catch (err) {
    peopleError.value = messageError(err)
  }
}

async function leaveGroup() {
  if (!meId.value) return
  peopleError.value = ''
  try {
    await $fetch(`/api/messages/conversations/${props.conversationId}/members/${meId.value}`, { method: 'DELETE' })
    await refreshUnread()
    await navigateTo('/messages')
  } catch (err) {
    peopleError.value = messageError(err)
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') void pollNew()
}

function startPoll() {
  stopPoll()
  pollTimer = setInterval(() => {
    void pollNew()
  }, 4000)
  document.addEventListener('visibilitychange', onVisible)
}

function stopPoll() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  document.removeEventListener('visibilitychange', onVisible)
}

watch(
  () => props.conversationId,
  () => {
    messages.value = []
    void openThread()
  },
  { immediate: true },
)

onMounted(startPoll)
onUnmounted(() => {
  stopPoll()
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<style>
.official-message-html h1 { font-size: 1.5rem; font-weight: 700; line-height: 1.25; margin: 0.75rem 0 0.4rem; }
.official-message-html h2 { font-size: 1.25rem; font-weight: 700; line-height: 1.25; margin: 0.75rem 0 0.35rem; }
.official-message-html h3 { font-size: 1.125rem; font-weight: 600; line-height: 1.375; margin: 0.65rem 0 0.3rem; }
.official-message-html h4 { font-size: 1rem; font-weight: 600; line-height: 1.375; margin: 0.5rem 0 0.25rem; }
.official-message-html p { margin: 0.3rem 0; }
.official-message-html ul { list-style: disc; padding-left: 1.25rem; margin: 0.3rem 0; }
.official-message-html ol { list-style: decimal; padding-left: 1.25rem; margin: 0.3rem 0; }
.official-message-html blockquote { border-left: 3px solid #d1d5db; padding-left: 0.75rem; color: #4b5563; margin: 0.4rem 0; }
.official-message-html a { color: rgb(13, 94, 130); text-decoration: underline; }
.official-message-html img { display: block; max-width: 100%; height: auto; border-radius: 0.5rem; }
.official-message-html img[data-size="small"] { width: 10rem; }
.official-message-html img[data-size="medium"] { width: 16rem; }
.official-message-html img[data-size="large"] { width: 24rem; }
.official-message-html img[data-size="full"] { width: 100%; }
.official-message-html img[data-align="left"] { float: left; margin: 0.2rem 1rem 0.6rem 0; }
.official-message-html img[data-align="right"] { float: right; margin: 0.2rem 0 0.6rem 1rem; }
.official-message-html pre { margin: 0.4rem 0; overflow-x: auto; border-radius: 0.375rem; border: 1px solid #e5e7eb; background: #f9fafb; padding: 0.6rem; font-size: 0.75rem; }
.official-message-html table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
.official-message-html th,
.official-message-html td { border: 1px solid #d1d5db; padding: 0.35rem 0.5rem; vertical-align: top; }
.official-message-html th { background: #f3f4f6; font-weight: 600; }
.official-message-html::after { content: ''; display: block; clear: both; }
</style>

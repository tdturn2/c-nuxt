export type MessageRole = 'owner' | 'admin' | 'member'

export type MessagePerson = {
  id: number
  name: string
  avatarUrl: string | null
  role?: MessageRole
}

export type ConversationSummary = {
  id: number
  type: 'dm' | 'group' | 'channel'
  title: string | null
  audience: string | null
  label: string
  avatarUrl: string | null
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unread: boolean
  myRole: MessageRole | null
  memberCount: number
  members: MessagePerson[]
  /** Audience channel, or a direct message with a dashboard-listed office account. */
  official?: boolean
}

export type ChatMessage = {
  id: number
  conversationId: number
  sender: MessagePerson | null
  kind: 'user' | 'official' | 'system'
  body: string
  postId: number | null
  createdAt: string
  deleted: boolean
}

export function messageError(err: unknown): string {
  const error = err as { data?: { error?: unknown }; statusMessage?: string; message?: string }
  if (typeof error?.data?.error === 'string' && error.data.error.trim()) return error.data.error
  if (typeof error?.statusMessage === 'string' && error.statusMessage.trim() && error.statusMessage !== 'Server Error') {
    return error.statusMessage
  }
  return 'Something went wrong'
}

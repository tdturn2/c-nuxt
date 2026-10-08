import {
  COMMUNICATIONS_PRF_SLUG,
  communicationsPrfTrelloCard,
  parseTrelloMemberIds,
} from '@shared/communicationsPrf'
import type { FormAnswerField } from '@shared/formNotificationEmail'

type TrelloConfig = {
  key: string
  token: string
  listId: string
  memberIds: string
  membersByRequestType: string
}

function trelloConfig(): TrelloConfig {
  const config = useRuntimeConfig()
  return {
    key: String(config.trelloApiKey || '').trim(),
    token: String(config.trelloToken || '').trim(),
    listId: String(config.trelloListId || '').trim(),
    memberIds: String(config.trelloMemberIds || '').trim(),
    membersByRequestType: String(config.trelloPrfMembers || '').trim(),
  }
}

export function trelloConfigured(): boolean {
  const config = trelloConfig()
  return !!(config.key && config.token && config.listId)
}

export async function createCommunicationsTrelloCard(input: {
  formSlug: string
  answers: Record<string, unknown>
  fields: FormAnswerField[]
  submitterEmail: string
}): Promise<{ id: string; url: string } | null> {
  if (input.formSlug !== COMMUNICATIONS_PRF_SLUG) return null
  const config = trelloConfig()
  if (!config.key || !config.token || !config.listId) {
    console.warn('[trello] skipped communications card; TRELLO_API_KEY, TRELLO_TOKEN, or TRELLO_LIST_ID is missing')
    return null
  }

  const card = communicationsPrfTrelloCard(input.answers, input.fields, input.submitterEmail)
  const members = parseTrelloMemberIds(config.memberIds, config.membersByRequestType, card.requestType)
  const params = new URLSearchParams({
    key: config.key,
    token: config.token,
    idList: config.listId,
    name: card.name,
    desc: card.desc,
  })
  if (card.due) params.set('due', card.due)
  if (members.length) params.set('idMembers', members.join(','))

  const res = await fetch(`https://api.trello.com/1/cards?${params.toString()}`, { method: 'POST' })
  const body = await res.json().catch(() => null) as { id?: string; url?: string; message?: string } | null
  if (!res.ok || !body?.id) {
    console.warn('[trello] card create failed', res.status, body?.message || '')
    return null
  }
  return { id: body.id, url: String(body.url || '') }
}

export async function attachFileToCommunicationsTrelloCard(input: {
  formSlug: string
  cardId: string
  filename: string
  mimeType: string
  bytes: Buffer
}): Promise<void> {
  if (input.formSlug !== COMMUNICATIONS_PRF_SLUG) return
  const cardId = String(input.cardId || '').trim()
  if (!/^[a-f0-9]{24}$/i.test(cardId)) return
  const config = trelloConfig()
  if (!config.key || !config.token || !config.listId) return

  const auth = new URLSearchParams({ key: config.key, token: config.token, fields: 'idList' })
  const existing = await fetch(`https://api.trello.com/1/cards/${cardId}?${auth.toString()}`)
  const card = await existing.json().catch(() => null) as { idList?: string } | null
  if (!existing.ok || card?.idList !== config.listId) {
    console.warn('[trello] refused attachment; card is not on the communications list')
    return
  }

  const form = new FormData()
  form.set('key', config.key)
  form.set('token', config.token)
  form.set('name', input.filename || 'attachment')
  form.set('file', new Blob([input.bytes], { type: input.mimeType || 'application/octet-stream' }), input.filename || 'attachment')

  const res = await fetch(`https://api.trello.com/1/cards/${cardId}/attachments`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const message = await res.text().catch(() => '')
    console.warn('[trello] attachment failed', res.status, message.slice(0, 200))
  }
}

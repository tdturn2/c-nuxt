import { createError } from 'h3'
import { isConnectAdminUser, normalizeConnectGroupSlugs } from '@shared/connectUserAccess'
import {
  canEditPageByGroups,
  childPagePath,
  joinConnectPageSlugs,
} from '@shared/pageEditorGroups'

function payloadOrigin(raw: string): string {
  let b = raw.trim().replace(/\/+$/, '')
  if (b.endsWith('/api')) b = b.slice(0, -4).replace(/\/+$/, '')
  return b
}

export function connectApiOriginFromConfig(config: ReturnType<typeof useRuntimeConfig>): string {
  const payloadBaseUrl =
    (config.connectApi || config.public.connectApi || '').trim() ||
    (import.meta.dev ? 'http://localhost:3003' : '')
  if (!payloadBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing CONNECT_API' })
  }
  return payloadOrigin(payloadBaseUrl)
}

export async function loadConnectUserForPageEdit(origin: string, email: string) {
  const connectUserRes: any = await $fetch(
    `${origin}/api/connect-users?where[email][equals]=${encodeURIComponent(email)}&limit=1&depth=1`,
  ).catch((err: any) => {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to load connect-user',
      data: err?.data,
    })
  })
  return (Array.isArray(connectUserRes?.docs) ? connectUserRes.docs[0] : null) || null
}

function parentIdFromPage(page: any): string | number | null {
  const parent = page?.parent
  if (parent == null) return page?.parentId ?? null
  if (typeof parent === 'object') return parent.id ?? null
  return parent
}

export async function resolveConnectPagePath(origin: string, page: any): Promise<string> {
  const slugs: string[] = []
  let current = page
  const seen = new Set<string>()
  while (current) {
    const id = current.id != null ? String(current.id) : ''
    if (id) {
      if (seen.has(id)) break
      seen.add(id)
    }
    const slug = String(current.slug || '').trim()
    if (slug) slugs.unshift(slug)
    const parentId = parentIdFromPage(current)
    if (parentId == null || parentId === '') break
    const parentObj = current.parent
    if (parentObj && typeof parentObj === 'object' && parentObj.slug) {
      current = parentObj
      continue
    }
    current = await $fetch(`${origin}/api/connect-pages/${encodeURIComponent(String(parentId))}?depth=1`)
  }
  return joinConnectPageSlugs(slugs)
}

export async function resolveConnectPagePathById(origin: string, id: string | number): Promise<{ page: any; path: string }> {
  const page = await $fetch(`${origin}/api/connect-pages/${encodeURIComponent(String(id))}?depth=1`).catch((err: any) => {
    throw createError({
      statusCode: err?.statusCode || 502,
      statusMessage: err?.statusMessage || 'Failed to load page',
      data: err?.data,
    })
  })
  const path = await resolveConnectPagePath(origin, page)
  return { page, path }
}

export async function resolveCreateConnectPagePath(origin: string, opts: {
  slug: string
  parent?: unknown
}): Promise<string> {
  const slug = String(opts.slug || '').trim()
  let parentId: string | number | null = null
  const parent = opts.parent
  if (parent != null && parent !== '') {
    if (typeof parent === 'object' && parent && 'id' in (parent as object)) {
      parentId = (parent as { id?: string | number }).id ?? null
    } else if (typeof parent === 'number' || typeof parent === 'string') {
      parentId = parent
    }
  }
  if (parentId == null) return joinConnectPageSlugs([slug])
  const { path: parentPath } = await resolveConnectPagePathById(origin, parentId)
  return childPagePath(parentPath, slug)
}

export function assertCanEditConnectPagePath(connectUser: any, pagePath: string) {
  const allowed = canEditPageByGroups({
    isAdmin: isConnectAdminUser(connectUser),
    groupSlugs: normalizeConnectGroupSlugs(connectUser),
    pagePath,
  })
  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - not allowed to edit this page',
    })
  }
}

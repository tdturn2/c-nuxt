export type ProductAnswer = {
  name: string
  price: number
  quantity: number
  lineTotal: number
}

export function parseMoney(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return roundMoney(value)
  const raw = String(value ?? '').replace(/[^0-9.-]/g, '')
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? roundMoney(n) : 0
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(roundMoney(amount))
}

export function normalizeProductAnswer(
  field: { label?: string; unitPrice?: number },
  value: unknown,
): ProductAnswer {
  const obj = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
  const price = parseMoney(obj?.price ?? field.unitPrice)
  const quantity = Math.max(0, Math.floor(parseMoney(obj?.quantity ?? value)))
  const name = String(obj?.name ?? field.label ?? '').trim()
  return {
    name,
    price,
    quantity,
    lineTotal: roundMoney(price * quantity),
  }
}

export function sumProductAnswers(
  fields: Array<{ id?: string; key?: string; type?: string; label?: string; unitPrice?: number }>,
  answers: Record<string, unknown>,
  visibleKeys?: Set<string>,
): number {
  let total = 0
  for (const field of fields) {
    if (String(field.type || '').toLowerCase() !== 'product') continue
    const key = String(field.id || field.key || '')
    if (!key) continue
    if (visibleKeys && !visibleKeys.has(key)) continue
    total += normalizeProductAnswer(field, answers[key]).lineTotal
  }
  return roundMoney(total)
}

export function applyProductAndTotalAnswers(
  fields: Array<{
    id: string
    type: string
    label?: string
    unitPrice?: number
  }>,
  answers: Record<string, unknown>,
  visibleKeys?: string[],
): Record<string, unknown> {
  const visible = visibleKeys ? new Set(visibleKeys) : undefined
  const out: Record<string, unknown> = { ...answers }
  for (const field of fields) {
    if (field.type === 'product') {
      if (visible && !visible.has(field.id)) continue
      out[field.id] = normalizeProductAnswer(field, out[field.id])
    }
  }
  const amount = sumProductAnswers(fields, out, visible)
  for (const field of fields) {
    if (field.type !== 'total') continue
    if (visible && !visible.has(field.id)) continue
    out[field.id] = {
      amount,
      formatted: formatMoney(amount),
    }
  }
  return out
}

export function resolveFormMergeTags(value: unknown, vars: { email?: string | null }): string {
  return String(value ?? '').replace(/\{user:user_email\}/gi, String(vars.email || '').trim())
}

export function formatStoredAnswer(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    if ('quantity' in obj && ('price' in obj || 'lineTotal' in obj)) {
      const quantity = Math.max(0, Math.floor(Number(obj.quantity) || 0))
      const price = parseMoney(obj.price)
      const lineTotal = parseMoney(obj.lineTotal ?? price * quantity)
      const name = String(obj.name || '').trim()
      const line = `${quantity} × ${formatMoney(price)} = ${formatMoney(lineTotal)}`
      return name ? `${name}: ${line}` : line
    }
    if ('formatted' in obj || 'amount' in obj) {
      const formatted = String(obj.formatted || '').trim()
      if (formatted) return formatted
      return formatMoney(parseMoney(obj.amount))
    }
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

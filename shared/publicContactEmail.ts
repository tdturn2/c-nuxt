/** Address shown on Connect and in directories. Login email stays the account and profile slug. */
export function publicContactEmail(user: {
  email?: string | null
  preferredEmail?: string | null
} | null | undefined): string | null {
  const preferred = String(user?.preferredEmail ?? '').trim()
  if (preferred) return preferred
  const email = String(user?.email ?? '').trim()
  return email || null
}

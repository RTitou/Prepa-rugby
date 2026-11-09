import type { SyncFields } from '../types/sync'

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Date locale du jour au format AAAA-MM-JJ. */
export function todayLocal(): string {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function newSyncFields(): SyncFields {
  return { id: newId(), updatedAt: nowIso(), deletedAt: null }
}

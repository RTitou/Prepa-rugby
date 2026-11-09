import { db } from '../db'
import { newSyncFields, nowIso } from '../ids'

/** Valeur d'un réglage technique (table meta), ou undefined. */
export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const row = await db.meta.where('key').equals(key).first()
  return row && row.deletedAt === null ? (row.value as T) : undefined
}

/** Crée ou met à jour un réglage technique (clé unique). */
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.transaction('rw', db.meta, async () => {
    const existing = await db.meta.where('key').equals(key).first()
    if (existing) await db.meta.put({ ...existing, value, deletedAt: null, updatedAt: nowIso() })
    else await db.meta.add({ ...newSyncFields(), key, value })
  })
}

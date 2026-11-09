import type { EntityTable } from 'dexie'
import type { SyncFields } from '../../types/sync'
import { nowIso } from '../ids'

type Table<T extends SyncFields> = EntityTable<T, 'id'>

/** Lignes actives (non supprimées logiquement). deletedAt n'est pas indexable (null) : filtre en mémoire. */
export async function activeRows<T extends SyncFields>(table: Table<T>): Promise<T[]> {
  return table.filter((row) => row.deletedAt === null).toArray()
}

/** Suppression logique : la ligne reste en base avec deletedAt renseigné. */
export async function softDelete<T extends SyncFields>(table: Table<T>, id: string): Promise<void> {
  const now = nowIso()
  // Dexie type l'objet de modification trop strictement pour un type générique.
  await table.update(id as never, { deletedAt: now, updatedAt: now } as never)
}

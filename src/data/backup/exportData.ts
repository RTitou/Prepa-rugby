import { db, SCHEMA_VERSION, TABLE_NAMES, type TableName } from '../db'
import { nowIso, todayLocal } from '../ids'
import { setMeta } from '../repositories/metaRepo'
import { BACKUP_APP, type BackupFile, type BackupTables } from './backupFormat'
import { LAST_BACKUP_KEY } from './backupReminder'

export type DeliveryResult = 'shared' | 'downloaded' | 'cancelled'

/** Nom du fichier : prepa-rugby-sauvegarde-AAAA-MM-JJ.json */
export function backupFileName(date: string = todayLocal()): string {
  return `prepa-rugby-sauvegarde-${date}.json`
}

/** Lit toutes les tables (suppressions logiques comprises) dans une seule transaction de lecture. */
export async function buildBackup(): Promise<BackupFile> {
  const tables = {} as BackupTables
  await db.transaction(
    'r',
    TABLE_NAMES.map((n) => db.table(n)),
    async () => {
      for (const name of TABLE_NAMES as readonly TableName[]) tables[name] = (await db.table(name).toArray()) as Record<string, unknown>[]
    },
  )
  return { app: BACKUP_APP, schemaVersion: SCHEMA_VERSION, exportedAt: nowIso(), tables }
}

/**
 * Remet le fichier à l'utilisateur : partage natif (téléphone) si le navigateur accepte de partager des fichiers,
 * sinon téléchargement. Un partage annulé par l'utilisateur renvoie 'cancelled'.
 */
export async function deliverBackup(file: BackupFile, name: string): Promise<DeliveryResult> {
  const json = JSON.stringify(file)
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    const shareable = new File([json], name, { type: 'application/json' })
    if (nav.canShare({ files: [shareable] })) {
      try {
        await nav.share({ files: [shareable], title: 'Sauvegarde Prépa Rugby' })
        return 'shared'
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
        // Partage impossible (autre erreur) : repli sur le téléchargement.
      }
    }
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

/** Exporte puis mémorise `lastBackupAt` (sauf partage annulé : aucune sauvegarde n'a eu lieu). */
export async function exportBackup(): Promise<{ result: DeliveryResult; fileName: string }> {
  const file = await buildBackup()
  const fileName = backupFileName()
  const result = await deliverBackup(file, fileName)
  if (result !== 'cancelled') await setMeta(LAST_BACKUP_KEY, file.exportedAt)
  return { result, fileName }
}

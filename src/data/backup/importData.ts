import { db, TABLE_NAMES, type TableName } from '../db'
import { newSyncFields } from '../ids'
import { parseBackup, type BackupFile, type ParseOptions } from './backupFormat'
import { LAST_BACKUP_KEY, REMINDER_DISMISSED_KEY } from './backupReminder'

/**
 * Remplace TOUTES les données par celles du fichier, dans une seule transaction : en cas d'erreur Dexie annule tout et la base
 * reste inchangée. Le fichier doit déjà être validé (parseBackup).
 *
 * Réglages de sauvegarde après import : le `lastBackupAt` du fichier est ignoré (il date de la sauvegarde précédente) et remplacé
 * par la date d'export du fichier importé, car les données restaurées sont exactement celles de ce fichier ; le masquage du
 * rappel présent dans le fichier est ignoré aussi. Ainsi l'import ne fait jamais croire à une sauvegarde plus récente qu'elle ne l'est.
 */
export async function replaceAllData(file: BackupFile): Promise<void> {
  const tables = TABLE_NAMES.map((n) => db.table(n))
  await db.transaction('rw', tables, async () => {
    for (const name of TABLE_NAMES as readonly TableName[]) {
      const table = db.table(name)
      await table.clear()
      let rows = file.tables[name]
      if (name === 'meta') rows = rows.filter((r) => r.key !== LAST_BACKUP_KEY && r.key !== REMINDER_DISMISSED_KEY)
      if (rows.length > 0) await table.bulkAdd(rows)
    }
    await db.meta.add({ ...newSyncFields(), key: LAST_BACKUP_KEY, value: file.exportedAt })
  })
}

/** Valide puis remplace. Un fichier invalide lève une BackupError avant toute écriture. */
export async function importBackupText(text: string, options?: ParseOptions): Promise<BackupFile> {
  const file = parseBackup(text, options)
  await replaceAllData(file)
  return file
}

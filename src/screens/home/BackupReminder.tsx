import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { dismissBackupReminder, ensureFirstLaunch, isBackupReminderDue, loadReminderInput } from '../../data/backup/backupReminder'
import { todayLocal } from '../../data/ids'
import { ignoreClosedDb } from '../../data/db'

/** Bandeau de rappel de sauvegarde (voir isBackupReminderDue pour les règles), masquable jusqu'au lendemain. */
export default function BackupReminder() {
  const today = todayLocal()
  useEffect(() => {
    ignoreClosedDb(ensureFirstLaunch(today))
  }, [today])
  const due = useLiveQuery(async () => isBackupReminderDue(await loadReminderInput(today)), [today])
  if (!due) return null
  return (
    <div className="banner banner--info" role="note" aria-label="Rappel de sauvegarde">
      <p>
        Pense à sauvegarder tes données : elles ne sont que sur cet appareil.{' '}
        <Link to="/profil">Aller aux Réglages</Link>
      </p>
      <div className="banner__actions">
        <button type="button" className="btn btn--ghost" onClick={() => void dismissBackupReminder(today)}>
          Plus tard
        </button>
      </div>
    </div>
  )
}

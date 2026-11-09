import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { LAST_BACKUP_KEY } from '../../data/backup/backupReminder'
import { exportBackup } from '../../data/backup/exportData'
import { getMeta } from '../../data/repositories/metaRepo'
import BackupImport from '../shared/BackupImport'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BackupSection() {
  const last = useLiveQuery(async () => (await getMeta<string>(LAST_BACKUP_KEY)) ?? null, [])
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function onExport() {
    setBusy(true)
    setMessage(null)
    try {
      const { result, fileName } = await exportBackup()
      if (result === 'downloaded') setMessage({ kind: 'ok', text: `Sauvegarde téléchargée : ${fileName}.` })
      else if (result === 'shared') setMessage({ kind: 'ok', text: 'Sauvegarde partagée.' })
    } catch {
      setMessage({ kind: 'error', text: 'Export impossible sur cet appareil.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="h-sauvegarde" className="settings__section">
      <h2 id="h-sauvegarde">Sauvegarde</h2>
      <p>{last === undefined ? 'Chargement…' : last ? `Dernière sauvegarde : ${formatDate(last)}.` : 'Aucune sauvegarde pour le moment.'}</p>
      <p className="muted">
        Tes données sont enregistrées uniquement sur cet appareil. Safari peut les effacer si l’appli n’est pas installée sur
        l’écran d’accueil : exporte une sauvegarde régulièrement et garde le fichier en lieu sûr.
      </p>
      {message ? (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'form-error' : 'form-ok'}>
          {message.text}
        </p>
      ) : null}
      <div className="banner__actions">
        <button type="button" className="btn" disabled={busy} onClick={() => void onExport()}>
          Exporter ma sauvegarde
        </button>
        <BackupImport />
      </div>
    </section>
  )
}

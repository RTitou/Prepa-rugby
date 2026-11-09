import { useId, useState } from 'react'
import { BackupError, parseBackup, type BackupFile } from '../../data/backup/backupFormat'
import { replaceAllData } from '../../data/backup/importData'

/**
 * Import d'une sauvegarde : choix du fichier, validation complète (rien n'est écrit), confirmation explicite,
 * puis remplacement de toutes les données. Utilisé dans les Réglages et au premier lancement (nouvel appareil).
 */
export default function BackupImport({ label = 'Importer une sauvegarde' }: { label?: string }) {
  const inputId = useId()
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    setPending(null)
    setMessage(null)
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
    } catch (e) {
      setMessage({
        kind: 'error',
        text: e instanceof BackupError ? `${e.message} Tes données actuelles n’ont pas été modifiées.` : 'Fichier illisible. Tes données actuelles n’ont pas été modifiées.',
      })
    }
  }

  async function confirm() {
    if (!pending) return
    setBusy(true)
    try {
      await replaceAllData(pending)
      setPending(null)
      setMessage({ kind: 'ok', text: 'Sauvegarde importée : tes données ont été restaurées.' })
    } catch {
      setMessage({ kind: 'error', text: 'Import impossible : rien n’a été modifié.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="backup-import">
      <label className="btn btn--ghost" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={(e) => {
          const input = e.target
          void onFile(input.files?.[0]).then(() => {
            input.value = ''
          })
        }}
      />
      {pending ? (
        <div className="banner banner--warn" role="alertdialog" aria-label="Confirmer l’import">
          <p>
            <strong>Remplacer toutes les données actuelles ?</strong>
            <br />
            Sauvegarde du {new Date(pending.exportedAt).toLocaleDateString('fr-FR')}. Cette action ne peut pas être annulée.
          </p>
          <div className="banner__actions">
            <button type="button" className="btn" disabled={busy} onClick={() => void confirm()}>
              Remplacer
            </button>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setPending(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'form-error' : 'form-ok'}>
          {message.text}
        </p>
      ) : null}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getStoredPersistResult, requestPersistentStorage, type PersistResult } from './persistStorage'

/** Demande le stockage persistant au lancement ; avertissement discret s'il est refusé. */
export default function StorageNotice() {
  const [result, setResult] = useState<PersistResult | null>(getStoredPersistResult)

  useEffect(() => {
    let active = true
    void requestPersistentStorage().then((r) => {
      if (active) setResult(r)
    })
    return () => {
      active = false
    }
  }, [])

  if (result !== 'denied') return null
  return (
    <div className="banner banner--warn" role="status">
      Ton navigateur n'a pas garanti la conservation des données. Installe l'appli sur l'écran d'accueil et pense à
      faire des sauvegardes.
    </div>
  )
}

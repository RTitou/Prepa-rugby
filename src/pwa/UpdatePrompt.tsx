import { useSyncExternalStore } from 'react'
import { applyUpdate, getNeedRefresh, subscribeUpdate } from './registerPwa'

export default function UpdatePrompt() {
  const needRefresh = useSyncExternalStore(subscribeUpdate, getNeedRefresh)
  if (!needRefresh) return null
  return (
    <div className="banner banner--info" role="status">
      <span>Nouvelle version disponible.</span>
      <button type="button" className="btn" onClick={() => void applyUpdate()}>
        Mettre à jour
      </button>
    </div>
  )
}

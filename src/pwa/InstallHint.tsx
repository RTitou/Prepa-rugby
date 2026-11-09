import { useEffect, useState } from 'react'

const DISMISS_KEY = 'prepa-rugby:install-hint-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return (
    nav.standalone === true ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches)
  )
}

export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Invite « Ajouter à l'écran d'accueil », affichée uniquement hors mode installé. */
export default function InstallHint() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState<boolean>(() => isStandalone() || wasDismissed())

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden) return null

  const ios = isIos()
  // Hors iOS, l'invite n'apparaît que si le navigateur propose l'installation.
  if (!ios && !installEvent) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignoré : l'invite réapparaîtra au prochain lancement
    }
    setHidden(true)
  }

  return (
    <div className="banner banner--info" role="region" aria-label="Installer l'appli">
      {ios ? (
        <span>
          Pour l'installer : touche <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>.
        </span>
      ) : (
        <span>Installe l'appli pour l'utiliser en plein écran et hors connexion.</span>
      )}
      <span className="banner__actions">
        {!ios && installEvent && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              void installEvent.prompt()
              setInstallEvent(null)
            }}
          >
            Installer
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={dismiss}>
          Plus tard
        </button>
      </span>
    </div>
  )
}

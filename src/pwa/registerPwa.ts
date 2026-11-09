import { registerSW } from 'virtual:pwa-register'

type Listener = () => void

let needRefresh = false
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

/** Enregistre le service worker ; signale quand une nouvelle version attend d'être activée. */
export function registerPwa(): void {
  updateSW = registerSW({
    onNeedRefresh() {
      needRefresh = true
      emit()
    },
  })
}

export function subscribeUpdate(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getNeedRefresh(): boolean {
  return needRefresh
}

/** Active la nouvelle version et recharge la page. */
export async function applyUpdate(): Promise<void> {
  await updateSW?.(true)
}

export type PersistResult = 'granted' | 'denied' | 'unsupported'

export const PERSIST_STORAGE_KEY = 'prepa-rugby:persist-storage'

function isPersistResult(value: string | null): value is PersistResult {
  return value === 'granted' || value === 'denied' || value === 'unsupported'
}

/** Dernier résultat mémorisé de la demande de stockage persistant, ou null si jamais demandé. */
export function getStoredPersistResult(): PersistResult | null {
  try {
    const value = localStorage.getItem(PERSIST_STORAGE_KEY)
    return isPersistResult(value) ? value : null
  } catch {
    return null
  }
}

function remember(result: PersistResult): void {
  try {
    localStorage.setItem(PERSIST_STORAGE_KEY, result)
  } catch {
    // stockage indisponible : le résultat n'est simplement pas mémorisé
  }
}

/**
 * Demande au navigateur de ne pas effacer les données locales (protection contre Safari, etc.).
 * Le résultat est mémorisé ; une permission déjà accordée n'est pas redemandée.
 */
export async function requestPersistentStorage(): Promise<PersistResult> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined
  if (!storage || typeof storage.persist !== 'function') {
    remember('unsupported')
    return 'unsupported'
  }
  try {
    const already = typeof storage.persisted === 'function' ? await storage.persisted() : false
    const granted = already || (await storage.persist())
    const result: PersistResult = granted ? 'granted' : 'denied'
    remember(result)
    return result
  } catch {
    remember('denied')
    return 'denied'
  }
}

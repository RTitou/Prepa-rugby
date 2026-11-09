import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PERSIST_STORAGE_KEY,
  getStoredPersistResult,
  requestPersistentStorage,
} from '../../src/pwa/persistStorage'

function mockStorage(storage: Partial<StorageManager> | undefined) {
  vi.stubGlobal('navigator', { ...navigator, storage })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requestPersistentStorage', () => {
  it("mémorise « granted » quand le navigateur accepte", async () => {
    const persist = vi.fn().mockResolvedValue(true)
    mockStorage({ persist, persisted: vi.fn().mockResolvedValue(false) })
    await expect(requestPersistentStorage()).resolves.toBe('granted')
    expect(persist).toHaveBeenCalledOnce()
    expect(localStorage.getItem(PERSIST_STORAGE_KEY)).toBe('granted')
  })

  it("mémorise « denied » quand le navigateur refuse", async () => {
    mockStorage({ persist: vi.fn().mockResolvedValue(false), persisted: vi.fn().mockResolvedValue(false) })
    await expect(requestPersistentStorage()).resolves.toBe('denied')
    expect(getStoredPersistResult()).toBe('denied')
  })

  it('ne redemande pas si le stockage est déjà persistant', async () => {
    const persist = vi.fn()
    mockStorage({ persist, persisted: vi.fn().mockResolvedValue(true) })
    await expect(requestPersistentStorage()).resolves.toBe('granted')
    expect(persist).not.toHaveBeenCalled()
  })

  it("mémorise « unsupported » sans API de stockage", async () => {
    mockStorage(undefined)
    await expect(requestPersistentStorage()).resolves.toBe('unsupported')
    expect(getStoredPersistResult()).toBe('unsupported')
  })
})

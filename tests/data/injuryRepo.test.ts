import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/data/db'
import { declareInjury, healInjury, listActiveInjuries, listInjuries, removeInjury } from '../../src/data/repositories/injuryRepo'
import type { BodyZone } from '../../src/types/reference'
import { resetDb } from '../helpers'

beforeEach(resetDb)

describe('dépôt des blessures', () => {
  it('déclare, liste, guérit et supprime logiquement', async () => {
    const knee = await declareInjury({ zone: 'genou', declaredOn: '2026-10-07', severeSigns: [], comment: '  gonflé  ' })
    expect(knee).toMatchObject({ zone: 'genou', status: 'active', healedOn: null, comment: 'gonflé', deletedAt: null })
    expect(await listActiveInjuries()).toHaveLength(1)

    await healInjury(knee.id, '2026-10-20')
    expect(await listActiveInjuries()).toHaveLength(0)
    expect((await listInjuries())[0]).toMatchObject({ status: 'guerie', healedOn: '2026-10-20' })

    await removeInjury(knee.id)
    expect(await listInjuries()).toHaveLength(0)
    expect((await db.injuries.get(knee.id))?.deletedAt).not.toBeNull()
  })

  it('ne crée pas de doublon sur une zone déjà active et cumule les signes graves', async () => {
    await declareInjury({ zone: 'epaule', declaredOn: '2026-10-07', severeSigns: [] })
    const merged = await declareInjury({ zone: 'epaule', declaredOn: '2026-10-08', severeSigns: ['deformation'] })
    expect(await db.injuries.count()).toBe(1)
    expect(merged.severeSigns).toEqual(['deformation'])
  })

  it('refuse une zone, une date ou un signe invalide', async () => {
    await expect(declareInjury({ zone: 'orteil' as BodyZone, declaredOn: '2026-10-07', severeSigns: [] })).rejects.toThrow()
    await expect(declareInjury({ zone: 'genou', declaredOn: '07/10/2026', severeSigns: [] })).rejects.toThrow()
    await expect(declareInjury({ zone: 'genou', declaredOn: '2026-10-07', severeSigns: ['inconnu'] })).rejects.toThrow()
  })
})

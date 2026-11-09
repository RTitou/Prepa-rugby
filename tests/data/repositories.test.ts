import { beforeEach, describe, expect, it } from 'vitest'
import { AppDb, db } from '../../src/data/db'
import {
  addClubDay,
  addMatch,
  listClubDays,
  listMatches,
  removeClubDay,
  removeMatch,
  setClubDays,
  updateMatch,
} from '../../src/data/repositories/calendarRepo'
import { deleteProfile, getProfile, saveProfile } from '../../src/data/repositories/profileRepo'
import { addRecord, latestRecords, listRecords, removeRecord, updateRecord } from '../../src/data/repositories/recordsRepo'
import { lineOf, subgroupOf } from '../../src/types/profile'
import { SAMPLE_PROFILE, resetDb } from '../helpers'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

beforeEach(resetDb)

describe('schéma', () => {
  it('déclare la version 1 et toutes les tables prévues pour les phases suivantes', () => {
    expect(db.verno).toBe(1)
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['clubDays', 'injuries', 'matches', 'meta', 'plans', 'profile', 'records', 'sessionLogs', 'wellness'].sort(),
    )
  })
})

describe('profileRepo', () => {
  it('retourne null sans profil', async () => {
    expect(await getProfile()).toBeNull()
  })

  it('crée un profil avec UUID, updatedAt et deletedAt null', async () => {
    const p = await saveProfile(SAMPLE_PROFILE)
    expect(p.id).toMatch(UUID)
    expect(p.updatedAt).toMatch(ISO)
    expect(p.deletedAt).toBeNull()
    expect(await getProfile()).toEqual(p)
  })

  it('met à jour le profil existant sans en créer un second', async () => {
    const created = await saveProfile(SAMPLE_PROFILE)
    await new Promise((r) => setTimeout(r, 5))
    const updated = await saveProfile({ ...SAMPLE_PROFILE, weightKg: 85 })
    expect(updated.id).toBe(created.id)
    expect(updated.weightKg).toBe(85)
    expect(updated.updatedAt > created.updatedAt).toBe(true)
    expect(await db.profile.count()).toBe(1)
  })

  it('refuse un âge inférieur à 18 ans', async () => {
    await expect(saveProfile({ ...SAMPLE_PROFILE, age: 17 })).rejects.toThrow(/18 ans/)
    expect(await db.profile.count()).toBe(0)
  })

  it('suppression logique : la ligne reste en base mais le profil disparaît', async () => {
    const p = await saveProfile(SAMPLE_PROFILE)
    await deleteProfile(p.id)
    expect(await getProfile()).toBeNull()
    const raw = await db.profile.get(p.id)
    expect(raw?.deletedAt).toMatch(ISO)
  })

  it('déduit la ligne et le sous-groupe du poste', () => {
    expect(lineOf(1)).toBe('avants')
    expect(subgroupOf(8)).toBe('troisieme-ligne')
    expect(lineOf(10)).toBe('arrieres')
    expect(subgroupOf(10)).toBe('demis')
    expect(subgroupOf(13)).toBe('centres')
    expect(subgroupOf(15)).toBe('ailiers-arriere')
  })
})

describe('calendarRepo', () => {
  it('ajoute, liste (triés) et supprime logiquement les jours club', async () => {
    const jeudi = await addClubDay({ weekday: 4, intensity: 'normal', durationMin: 90 })
    const mardi = await addClubDay({ weekday: 2, intensity: 'lourd', durationMin: 120 })
    expect(mardi.id).toMatch(UUID)
    expect(mardi.updatedAt).toMatch(ISO)
    expect((await listClubDays()).map((d) => d.weekday)).toEqual([2, 4])
    await removeClubDay(jeudi.id)
    expect((await listClubDays()).map((d) => d.weekday)).toEqual([2])
    expect((await db.clubDays.get(jeudi.id))?.deletedAt).toMatch(ISO)
    expect(await db.clubDays.count()).toBe(2)
  })

  it('setClubDays ajoute, modifie et retire logiquement', async () => {
    await setClubDays([
      { weekday: 2, intensity: 'lourd', durationMin: 90 },
      { weekday: 4, intensity: 'normal', durationMin: 90 },
    ])
    const before = await listClubDays()
    const result = await setClubDays([
      { weekday: 2, intensity: 'normal', durationMin: 75 },
      { weekday: 5, intensity: 'lourd', durationMin: 60 },
    ])
    expect(result.map((d) => [d.weekday, d.intensity, d.durationMin])).toEqual([
      [2, 'normal', 75],
      [5, 'lourd', 60],
    ])
    expect(result[0]!.id).toBe(before[0]!.id)
    expect(await db.clubDays.count()).toBe(3)
  })

  it('gère les matchs : heure facultative, tri, modification, suppression logique', async () => {
    const m1 = await addMatch({ date: '2026-10-10', time: null })
    const m2 = await addMatch({ date: '2026-10-03', time: '15:00' })
    expect(m1.id).toMatch(UUID)
    expect((await listMatches()).map((m) => m.date)).toEqual(['2026-10-03', '2026-10-10'])
    expect((await listMatches('2026-10-05')).map((m) => m.date)).toEqual(['2026-10-10'])
    await updateMatch(m1.id, { time: '16:30' })
    expect((await db.matches.get(m1.id))?.time).toBe('16:30')
    await removeMatch(m2.id)
    expect((await listMatches()).length).toBe(1)
    expect((await db.matches.get(m2.id))?.deletedAt).toMatch(ISO)
  })

  it('rejette une date ou une heure invalide', async () => {
    await expect(addMatch({ date: '10/10/2026', time: null })).rejects.toThrow()
    await expect(addMatch({ date: '2026-10-10', time: '25:99' })).rejects.toThrow()
  })
})

describe('recordsRepo', () => {
  it('ajoute un record chargé et un temps, conserve l\'historique', async () => {
    const squat = await addRecord({ test: 'squat', value: 120, unit: 'kg', reps: 5, date: '2026-09-01' })
    await addRecord({ test: 'squat', value: 130, unit: 'kg', reps: 3, date: '2026-10-01' })
    await addRecord({ test: 'sprint-10m', value: 1.85, unit: 's', reps: null, date: '2026-10-01' })
    expect(squat.id).toMatch(UUID)
    expect(squat.updatedAt).toMatch(ISO)
    expect((await listRecords('squat')).map((r) => r.value)).toEqual([130, 120])
    const latest = await latestRecords()
    expect(latest.squat?.value).toBe(130)
    expect(latest['sprint-10m']?.value).toBe(1.85)
    expect(latest.bronco).toBeUndefined()
  })

  it('modifie et supprime logiquement', async () => {
    const r = await addRecord({ test: 'bronco', value: 285, unit: 's', reps: null, date: '2026-10-01' })
    await updateRecord(r.id, { value: 280 })
    expect((await db.records.get(r.id))?.value).toBe(280)
    await removeRecord(r.id)
    expect(await listRecords()).toEqual([])
    expect((await db.records.get(r.id))?.deletedAt).toMatch(ISO)
  })

  it('rejette les saisies incohérentes', async () => {
    await expect(addRecord({ test: 'squat', value: 100, unit: 'kg', reps: null, date: '2026-10-01' })).rejects.toThrow()
    await expect(addRecord({ test: 'squat', value: 100, unit: 's', reps: 5, date: '2026-10-01' })).rejects.toThrow()
    await expect(addRecord({ test: 'bronco', value: -1, unit: 's', reps: null, date: '2026-10-01' })).rejects.toThrow()
    await expect(addRecord({ test: 'bronco', value: 280, unit: 's', reps: 3, date: '2026-10-01' })).rejects.toThrow()
  })
})

describe('persistance après rechargement', () => {
  it('retrouve profil, calendrier et records dans une nouvelle ouverture de la base', async () => {
    await saveProfile(SAMPLE_PROFILE)
    await setClubDays([{ weekday: 2, intensity: 'lourd', durationMin: 90 }])
    await addMatch({ date: '2026-10-10', time: '15:00' })
    await addRecord({ test: 'squat', value: 120, unit: 'kg', reps: 5, date: '2026-10-01' })

    // Simule un rechargement de la page : connexion fermée, puis nouvelle instance sur la même base.
    db.close()
    const reopened = new AppDb()
    await reopened.open()
    expect(await reopened.profile.count()).toBe(1)
    expect((await reopened.clubDays.toArray())[0]?.weekday).toBe(2)
    expect((await reopened.matches.toArray())[0]?.time).toBe('15:00')
    expect((await reopened.records.toArray())[0]?.value).toBe(120)
    reopened.close()

    await db.open()
    expect((await getProfile())?.position).toBe(9)
  })
})

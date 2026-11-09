import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissBackupReminder, isBackupReminderDue, LAST_BACKUP_KEY, REMINDER_DISMISSED_KEY, loadReminderInput } from '../../src/data/backup/backupReminder'
import { BACKUP_MIGRATIONS, BackupError, parseBackup, type BackupFile } from '../../src/data/backup/backupFormat'
import { backupFileName, buildBackup, exportBackup } from '../../src/data/backup/exportData'
import { importBackupText, replaceAllData } from '../../src/data/backup/importData'
import { db, SCHEMA_VERSION, TABLE_NAMES } from '../../src/data/db'
import { addMatch, setClubDays } from '../../src/data/repositories/calendarRepo'
import { declareInjury, healInjury, removeInjury } from '../../src/data/repositories/injuryRepo'
import { getMeta, setMeta } from '../../src/data/repositories/metaRepo'
import { ensureWeekPlan, planStatus } from '../../src/data/repositories/planRepo'
import { addRecord, removeRecord } from '../../src/data/repositories/recordsRepo'
import { saveSessionLog } from '../../src/data/repositories/sessionLogRepo'
import { saveMorningWellness, saveSessionRating } from '../../src/data/repositories/wellnessRepo'
import { resetDb, seedProfile } from '../helpers'

const WEEK = '2026-10-05'

async function seedAll() {
  await seedProfile()
  await setClubDays([
    { weekday: 2, intensity: 'lourd', durationMin: 90 },
    { weekday: 4, intensity: 'normal', durationMin: 90 },
  ])
  await addMatch({ date: '2026-10-10', time: '15:00' })
  await addRecord({ test: 'squat', value: 140, unit: 'kg', reps: 3, date: '2026-09-20', variant: 'back-squat' })
  const gone = await addRecord({ test: 'sprint-10m', value: 1.9, unit: 's', reps: null, date: '2026-09-21' })
  await removeRecord(gone.id)
  await saveMorningWellness({ date: '2026-10-05', scores: { fatigue: 3, sommeil: 4, douleurs: 5, stress: 4, humeur: 4 }, painZone: null })
  await saveSessionRating({ kind: 'match', date: '2026-10-06', rpe: 7, durationMin: 80, minutesPlayed: 80, contactIntensity: 3 })
  const knee = await declareInjury({ zone: 'genou', declaredOn: '2026-10-03', severeSigns: [] })
  await healInjury(knee.id, '2026-10-04')
  const shoulder = await declareInjury({ zone: 'epaule', declaredOn: '2026-10-03', severeSigns: [] })
  await removeInjury(shoulder.id)
  const plan = await ensureWeekPlan(WEEK, WEEK)
  const s = plan!.days.find((d) => d.session)!.session!
  await saveSessionLog({ sessionId: s.id, date: s.date, weekStart: WEEK, title: s.title, warmupDone: true, sets: [] })
  await setMeta('custom', { a: 1 })
}

async function snapshot(): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {}
  for (const name of TABLE_NAMES) {
    let rows = (await db.table(name).toArray()) as { id: string; key?: string }[]
    if (name === 'meta') rows = rows.filter((r) => r.key !== LAST_BACKUP_KEY && r.key !== REMINDER_DISMISSED_KEY)
    out[name] = rows.sort((a, b) => a.id.localeCompare(b.id))
  }
  return out
}

beforeEach(async () => {
  await resetDb()
})
afterEach(() => vi.useRealTimers())

describe('export', () => {
  it('contient toutes les tables (suppressions logiques comprises), la version et la date', async () => {
    await seedAll()
    const file = await buildBackup()
    expect(file.app).toBe('prepa-rugby')
    expect(file.schemaVersion).toBe(SCHEMA_VERSION)
    expect(Number.isNaN(Date.parse(file.exportedAt))).toBe(false)
    expect(Object.keys(file.tables).sort()).toEqual([...TABLE_NAMES].sort())
    expect(file.tables.records).toHaveLength(2)
    expect(file.tables.records.some((r) => r.deletedAt !== null)).toBe(true)
    expect(file.tables.injuries).toHaveLength(2)
    expect(file.tables.plans).toHaveLength(1)
  })

  it('nomme le fichier avec la date et mémorise lastBackupAt (téléchargement)', async () => {
    expect(backupFileName('2026-10-01')).toBe('prepa-rugby-sauvegarde-2026-10-01.json')
    await seedAll()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { result } = await exportBackup()
    expect(result).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
    expect(typeof (await getMeta(LAST_BACKUP_KEY))).toBe('string')
    click.mockRestore()
  })

  it('un partage annulé ne mémorise pas de sauvegarde', async () => {
    await seedAll()
    const share = vi.fn().mockRejectedValue(new DOMException('annulé', 'AbortError'))
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    try {
      const { result } = await exportBackup()
      expect(result).toBe('cancelled')
      expect(await getMeta(LAST_BACKUP_KEY)).toBeUndefined()
    } finally {
      Reflect.deleteProperty(navigator, 'share')
      Reflect.deleteProperty(navigator, 'canShare')
    }
  })
})

describe('import', () => {
  it('aller-retour : export, base vide, import = données identiques et semaine identique', async () => {
    await seedAll()
    const before = await snapshot()
    const planBefore = await db.plans.toArray()
    const text = JSON.stringify(await buildBackup())

    await resetDb()
    expect(await db.profile.count()).toBe(0)
    const file = await importBackupText(text)

    expect(await snapshot()).toEqual(before)
    expect(await db.plans.toArray()).toEqual(planBefore)
    const status = await planStatus(WEEK, WEEK)
    expect(status.needsGeneration).toBe(false)
    // lastBackupAt = date d'export du fichier (pas celle, plus ancienne, qu'il contenait)
    expect(await getMeta(LAST_BACKUP_KEY)).toBe(file.exportedAt)
  })

  it('refuse un fichier corrompu, d’une autre appli ou d’une version future sans rien modifier', async () => {
    await seedAll()
    const before = await snapshot()
    const good = await buildBackup()
    const bad: [string, string, RegExp][] = [
      ['corrompu', '{"app":"prepa-rugby", oups', /JSON invalide/],
      ['autre appli', JSON.stringify({ ...good, app: 'autre' }), /pas une sauvegarde de Prépa Rugby/],
      ['version future', JSON.stringify({ ...good, schemaVersion: SCHEMA_VERSION + 1 }), /plus récente/],
      ['version illisible', JSON.stringify({ ...good, schemaVersion: 'x' }), /Version/],
      ['table absente', JSON.stringify({ ...good, tables: { ...good.tables, records: undefined } }), /« records »/],
      ['id manquant', JSON.stringify({ ...good, tables: { ...good.tables, matches: [{ date: '2026-10-10', updatedAt: 'x', deletedAt: null }] } }), /identifiant manquant/],
      ['id en double', JSON.stringify({ ...good, tables: { ...good.tables, clubDays: [...good.tables.clubDays, good.tables.clubDays[0]] } }), /en double/],
      ['forme invalide', JSON.stringify({ ...good, tables: { ...good.tables, plans: [{ id: 'p', updatedAt: 'x', deletedAt: null }] } }), /champs obligatoires/],
    ]
    for (const [label, text, message] of bad) {
      await expect(importBackupText(text), label).rejects.toThrow(BackupError)
      await expect(importBackupText(text), label).rejects.toThrow(message)
    }
    expect(await snapshot()).toEqual(before)
  })

  it('annule tout si l’écriture échoue en cours de route (une seule transaction)', async () => {
    await seedAll()
    const before = await snapshot()
    const good = await buildBackup()
    // Contourne la validation : deux réglages de même clé violent l'index unique pendant l'écriture de la dernière table.
    const broken: BackupFile = {
      ...good,
      tables: {
        ...good.tables,
        meta: [
          { id: 'm1', updatedAt: 'x', deletedAt: null, key: 'k', value: 1 },
          { id: 'm2', updatedAt: 'x', deletedAt: null, key: 'k', value: 2 },
        ],
      },
    }
    await expect(replaceAllData(broken)).rejects.toThrow()
    expect(await snapshot()).toEqual(before)
  })

  it('migre une ancienne version (simulée) ou la refuse explicitement', async () => {
    await seedAll()
    const good = await buildBackup()
    const old = JSON.stringify({ ...good, schemaVersion: 1 })
    const migrated = parseBackup(old, {
      currentVersion: 2,
      migrations: { 1: (t) => ({ ...t, records: t.records.map((r) => ({ ...r, migrated: true })) }) },
    })
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.tables.records.every((r) => r.migrated === true)).toBe(true)
    expect(() => parseBackup(old, { currentVersion: 2, migrations: {} })).toThrow(/non migrable/)
    expect(Object.keys(BACKUP_MIGRATIONS)).toHaveLength(0)
  })
})

describe('rappel', () => {
  const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()

  it('visible à 15 jours, absent à 3 et à 14 jours', () => {
    const base = { firstLaunchOn: '2026-09-01', hiddenUntil: undefined }
    expect(isBackupReminderDue({ ...base, today: '2026-10-16', lastBackupAt: day(2026, 10, 1) })).toBe(true)
    expect(isBackupReminderDue({ ...base, today: '2026-10-04', lastBackupAt: day(2026, 10, 1) })).toBe(false)
    expect(isBackupReminderDue({ ...base, today: '2026-10-15', lastBackupAt: day(2026, 10, 1) })).toBe(false)
  })

  it('jamais sauvegardé : pas le jour du premier lancement, oui dès le lendemain', () => {
    const base = { lastBackupAt: undefined, hiddenUntil: undefined, firstLaunchOn: '2026-10-01' }
    expect(isBackupReminderDue({ ...base, today: '2026-10-01' })).toBe(false)
    expect(isBackupReminderDue({ ...base, today: '2026-10-02' })).toBe(true)
  })

  it('masqué jusqu’au lendemain puis de retour', async () => {
    await setMeta(LAST_BACKUP_KEY, day(2026, 10, 1))
    await setMeta('firstLaunchOn', '2026-09-01')
    expect(isBackupReminderDue(await loadReminderInput('2026-10-16'))).toBe(true)
    await dismissBackupReminder('2026-10-16')
    expect(isBackupReminderDue(await loadReminderInput('2026-10-16'))).toBe(false)
    expect(isBackupReminderDue(await loadReminderInput('2026-10-17'))).toBe(true)
  })
})

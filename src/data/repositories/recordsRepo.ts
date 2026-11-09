import { db } from '../db'
import { newSyncFields, nowIso } from '../ids'
import { getRecordTest, type PerformanceRecord, type PerformanceRecordInput, type RecordTest } from '../../types/records'
import { activeRows, softDelete } from './base'

function assertRecord(input: PerformanceRecordInput): void {
  const def = getRecordTest(input.test)
  if (!Number.isFinite(input.value) || input.value <= 0) throw new Error('Valeur de record invalide.')
  if (input.unit !== def.unit) throw new Error(`Unité invalide pour ${def.label} (${def.unit} attendu).`)
  if (def.kind === 'load' && (input.reps === null || !Number.isInteger(input.reps) || input.reps < 1)) {
    throw new Error('Nombre de répétitions invalide.')
  }
  if (def.kind !== 'load' && input.reps !== null) throw new Error('Ce test ne porte pas de répétitions.')
  if (input.variant !== undefined && input.test !== 'squat') throw new Error('Seul le squat a une variante.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Date de record invalide (format AAAA-MM-JJ attendu).')
}

/** Records actifs, du plus récent au plus ancien, éventuellement pour un seul test. */
export async function listRecords(test?: RecordTest): Promise<PerformanceRecord[]> {
  const rows = await activeRows(db.records)
  return rows
    .filter((r) => test === undefined || r.test === test)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
}

export async function addRecord(input: PerformanceRecordInput): Promise<PerformanceRecord> {
  assertRecord(input)
  const created: PerformanceRecord = { ...newSyncFields(), ...input }
  await db.records.add(created)
  return created
}

export async function updateRecord(id: string, changes: Partial<PerformanceRecordInput>): Promise<void> {
  const current = await db.records.get(id)
  if (!current || current.deletedAt !== null) throw new Error('Record introuvable.')
  const merged: PerformanceRecordInput = {
    test: changes.test ?? current.test,
    value: changes.value ?? current.value,
    unit: changes.unit ?? current.unit,
    reps: changes.reps === undefined ? current.reps : changes.reps,
    date: changes.date ?? current.date,
    ...(changes.variant !== undefined ? { variant: changes.variant } : current.variant !== undefined ? { variant: current.variant } : {}),
  }
  assertRecord(merged)
  await db.records.update(id, { ...merged, updatedAt: nowIso() })
}

export async function removeRecord(id: string): Promise<void> {
  await softDelete(db.records, id)
}

/** Dernier résultat de chaque test ayant au moins un record. */
export async function latestRecords(): Promise<Partial<Record<RecordTest, PerformanceRecord>>> {
  const out: Partial<Record<RecordTest, PerformanceRecord>> = {}
  for (const r of await listRecords()) if (!out[r.test]) out[r.test] = r
  return out
}

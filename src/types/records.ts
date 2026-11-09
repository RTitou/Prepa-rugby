import type { SyncFields, WithoutSync } from './sync'

export type RecordTest =
  | 'squat'
  | 'developpe-couche'
  | 'sprint-10m'
  | 'sprint-40m'
  | 'bronco'
  | 'poids'
  | 'souleve-de-terre'
  | 'broad-jump'
  | 'saut-lateral-gauche'
  | 'saut-lateral-droite'
  | 't-test'

/**
 * « load » : charge × répétitions. « time » : temps en secondes (plus bas = mieux). « weight » : poids de corps (kg, sans répétitions).
 * « distance » : saut mesuré en cm (plus haut = mieux).
 */
export type RecordKind = 'load' | 'time' | 'weight' | 'distance'
export type RecordUnit = 'kg' | 's' | 'cm'

export interface RecordTestDef {
  test: RecordTest
  label: string
  kind: RecordKind
  unit: RecordUnit
}

export const RECORD_TESTS: readonly RecordTestDef[] = [
  { test: 'squat', label: 'Squat', kind: 'load', unit: 'kg' },
  { test: 'developpe-couche', label: 'Développé couché', kind: 'load', unit: 'kg' },
  { test: 'sprint-10m', label: 'Sprint 10 m', kind: 'time', unit: 's' },
  { test: 'sprint-40m', label: 'Sprint 40 m', kind: 'time', unit: 's' },
  { test: 'bronco', label: 'Bronco', kind: 'time', unit: 's' },
]

/**
 * Tous les tests saisissables dans l'écran Records. `RECORD_TESTS` (onboarding, profil) garde les cinq tests de performance ;
 * le poids de corps s'y ajoute ici pour suivre la masse et rapporter la force au poids de corps.
 */
export const ALL_RECORD_TESTS: readonly RecordTestDef[] = [
  ...RECORD_TESTS,
  { test: 'poids', label: 'Poids de corps', kind: 'weight', unit: 'kg' },
  { test: 'souleve-de-terre', label: 'Soulevé de terre', kind: 'load', unit: 'kg' },
  { test: 'broad-jump', label: 'Broad jump', kind: 'distance', unit: 'cm' },
  { test: 'saut-lateral-gauche', label: 'Saut latéral, jambe gauche', kind: 'distance', unit: 'cm' },
  { test: 'saut-lateral-droite', label: 'Saut latéral, jambe droite', kind: 'distance', unit: 'cm' },
  { test: 't-test', label: 'T-test', kind: 'time', unit: 's' },
]

/** Tests de l'intersaison ATP, passés en S1 puis refaits en S9 dans les mêmes conditions. */
export const ATP_TESTS: readonly RecordTest[] = [
  'squat',
  'developpe-couche',
  'bronco',
  'broad-jump',
  'saut-lateral-gauche',
  'saut-lateral-droite',
  't-test',
  'souleve-de-terre',
]

/** Variante d'exercice d'un record de squat : un front squat n'est pas un back squat (RC-3.4). */
export type SquatVariant = 'back-squat' | 'front-squat'
export const SQUAT_VARIANTS: { value: SquatVariant; label: string }[] = [
  { value: 'back-squat', label: 'Back squat' },
  { value: 'front-squat', label: 'Front squat' },
]

export function getRecordTest(test: RecordTest): RecordTestDef {
  const def = ALL_RECORD_TESTS.find((t) => t.test === test)
  if (!def) throw new Error(`Test inconnu : ${test}`)
  return def
}

/** Un résultat de test daté. L'historique est conservé : un nouveau résultat s'ajoute. */
export interface PerformanceRecord extends SyncFields {
  test: RecordTest
  /** Charge en kg, ou temps en secondes selon `unit`. */
  value: number
  unit: RecordUnit
  /** Répétitions pour une charge ; null pour un temps. */
  reps: number | null
  /** Date locale AAAA-MM-JJ du test. */
  date: string
  /** Squat seulement : variante réalisée. Absent = back squat. */
  variant?: SquatVariant
}

/** Exercice de bibliothèque correspondant au record (pour choisir un protocole de repère compatible), null pour un temps ou un poids. */
export function recordExerciseId(record: Pick<PerformanceRecord, 'test' | 'variant'>): string | null {
  if (record.test === 'squat') return record.variant ?? 'back-squat'
  if (record.test === 'developpe-couche') return 'bench-press'
  if (record.test === 'souleve-de-terre') return 'deadlift'
  return null
}
export type PerformanceRecordInput = WithoutSync<PerformanceRecord>

import { ATP_TESTS, getRecordTest, type PerformanceRecord, type RecordTest, type RecordUnit } from '../types/records'
import { addDays, mondayOf } from './dates'
import { atpOneRepMax } from './progression/oneRepMax'

/*
 * Bilan de l'intersaison ATP : chaque test de la semaine 1 comparé au même test de la semaine 9, et asymétrie gauche / droite
 * du saut latéral. Fonction pure.
 */

export interface TestReview {
  test: RecordTest
  label: string
  unit: RecordUnit
  s1: PerformanceRecord | null
  s9: PerformanceRecord | null
  /** Écart S9 − S1 dans l'unité du test (1RM ATP pour une charge testée à un nombre de reps différent), null s'il manque un test. */
  delta: number | null
  /** Vrai si l'écart est un progrès (plus haut = mieux, sauf pour un temps). */
  improved: boolean | null
  /** Charge comparée en 1RM ATP (répétitions différentes entre S1 et S9). */
  viaOneRm: boolean
}

export interface Asymmetry {
  left: number
  right: number
  /** Écart en % de la meilleure jambe. */
  pct: number
  weaker: 'gauche' | 'droite' | null
}

function lastIn(records: readonly PerformanceRecord[], test: RecordTest, from: string, to: string): PerformanceRecord | null {
  const rows = records.filter((r) => r.test === test && r.date >= from && r.date <= to)
  rows.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
  return rows[0] ?? null
}

export function atpReview(records: readonly PerformanceRecord[], startMonday: string): TestReview[] {
  const start = mondayOf(startMonday)
  const s1From = start
  const s1To = addDays(start, 6)
  const s9From = addDays(start, 56)
  const s9To = addDays(start, 62)
  return ATP_TESTS.map((test) => {
    const def = getRecordTest(test)
    const s1 = lastIn(records, test, s1From, s1To)
    const s9 = lastIn(records, test, s9From, s9To)
    let delta: number | null = null
    let viaOneRm = false
    if (s1 && s9) {
      if (def.kind === 'load' && s1.reps !== null && s9.reps !== null && s1.reps !== s9.reps) {
        delta = atpOneRepMax(s9.value, s9.reps) - atpOneRepMax(s1.value, s1.reps)
        viaOneRm = true
      } else {
        delta = s9.value - s1.value
      }
    }
    const improved = delta === null ? null : def.kind === 'time' ? delta < 0 : delta > 0
    return { test, label: def.label, unit: def.unit, s1, s9, delta, improved, viaOneRm }
  })
}

/** Asymétrie du saut latéral : derniers résultats gauche et droite. null s'il en manque un. */
export function lateralAsymmetry(records: readonly PerformanceRecord[]): Asymmetry | null {
  const latest = (test: RecordTest) =>
    [...records].filter((r) => r.test === test).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0]
  const l = latest('saut-lateral-gauche')
  const r = latest('saut-lateral-droite')
  if (!l || !r) return null
  const best = Math.max(l.value, r.value)
  const pct = best > 0 ? (Math.abs(l.value - r.value) * 100) / best : 0
  return { left: l.value, right: r.value, pct, weaker: l.value === r.value ? null : l.value < r.value ? 'gauche' : 'droite' }
}

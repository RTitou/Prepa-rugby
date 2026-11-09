import { todayLocal } from '../../data/ids'
import { parseDecimal, parseDuration } from '../../lib/numbers'
import { RECORD_TESTS, type PerformanceRecordInput, type RecordTest } from '../../types/records'

/** Saisie d'un record : la charge ou le temps vide = record non renseigné. */
export interface RecordDraft {
  load: string
  reps: string
  time: string
  date: string
}

export type RecordDrafts = Record<RecordTest, RecordDraft>

export function emptyRecordDrafts(): RecordDrafts {
  const date = todayLocal()
  return Object.fromEntries(RECORD_TESTS.map((t) => [t.test, { load: '', reps: '1', time: '', date }])) as RecordDrafts
}

/** Plages plausibles par test (garde-fou contre les fautes de frappe). */
const TIME_RANGE: Partial<Record<RecordTest, [number, number]>> = {
  'sprint-10m': [1, 5],
  'sprint-40m': [3, 15],
  bronco: [150, 900],
}

/** Records renseignés, ou message d'erreur. Les tests laissés vides sont ignorés (facultatifs). */
export function recordDraftsToInputs(drafts: RecordDrafts): { inputs: PerformanceRecordInput[]; error: string | null } {
  const inputs: PerformanceRecordInput[] = []
  for (const def of RECORD_TESTS) {
    const d = drafts[def.test]
    if (def.kind === 'load') {
      if (d.load.trim() === '') continue
      const load = parseDecimal(d.load)
      const reps = parseDecimal(d.reps)
      if (load === null || load < 10 || load > 500) return { inputs: [], error: `${def.label} : indique une charge entre 10 et 500 kg.` }
      if (reps === null || !Number.isInteger(reps) || reps < 1 || reps > 30) {
        return { inputs: [], error: `${def.label} : indique un nombre de répétitions entre 1 et 30.` }
      }
      inputs.push({ test: def.test, value: load, unit: 'kg', reps, date: d.date || todayLocal() })
    } else {
      if (d.time.trim() === '') continue
      const time = parseDuration(d.time)
      const range = TIME_RANGE[def.test]
      if (time === null || (range && (time < range[0] || time > range[1]))) {
        const hint = def.test === 'bronco' ? 'par exemple 4:45' : 'en secondes, par exemple 1,85'
        return { inputs: [], error: `${def.label} : temps invalide (${hint}).` }
      }
      inputs.push({ test: def.test, value: time, unit: 's', reps: null, date: d.date || todayLocal() })
    }
  }
  return { inputs, error: null }
}

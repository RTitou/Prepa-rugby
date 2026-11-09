import { lineOf, type PlayLevel, type Profile } from '../../types/profile'
import { getRecordTest, type PerformanceRecord, type RecordTest, type SquatVariant } from '../../types/records'
import { TREND_WINDOW_WEEKS } from '../config'
import type { Orientation } from '../context'
import { addDays } from '../dates'
import { proposeLevelUp } from '../progression/level'
import { recordOneRepMax } from '../progression/oneRepMax'
import { compareMass, compareRecord, type Comparison, type MassComparison, type PlayerContext } from './compare'
import { orient } from './orient'

export type AnalysisProfile = Pick<Profile, 'sex' | 'position' | 'level' | 'weightKg'>

/** Un test suivi dans le temps : le squat est séparé par variante (back / front), les autres par test. */
export interface Series {
  key: string
  test: RecordTest
  variant: SquatVariant | null
  label: string
  /** Du plus ancien au plus récent. */
  history: PerformanceRecord[]
  latest: PerformanceRecord
  /** Valeurs de la courbe : 1RM estimé pour une charge, valeur brute sinon. */
  curve: number[]
  /** 1RM estimé du dernier record, null hors charge. */
  latestOneRepMax: number | null
  /** Plus bas = mieux (temps). */
  lowerIsBetter: boolean
  comparison: Comparison
}

export interface Analysis {
  bodyweightKg: number
  series: Series[]
  mass: MassComparison | undefined
  massGainPct: number | null
  sprint10Delta: number | null
  orientation: Orientation | null
  /** Niveau supérieur à proposer au joueur (jamais appliqué seul), ou null. */
  levelProposal: PlayLevel | null
}

function seriesKey(r: PerformanceRecord): string {
  return r.test === 'squat' ? `squat:${r.variant ?? 'back-squat'}` : r.test
}

function byDateAsc(a: PerformanceRecord, b: PerformanceRecord): number {
  return a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt)
}

/** Variation entre le plus ancien et le plus récent enregistrement de la fenêtre ; null s'il y en a moins de deux. */
function windowChange(records: readonly PerformanceRecord[], from: string, to: string): { first: number; last: number } | null {
  const inWindow = records.filter((r) => r.date >= from && r.date <= to).sort(byDateAsc)
  if (inWindow.length < 2) return null
  return { first: inWindow[0]!.value, last: inWindow[inWindow.length - 1]!.value }
}

/**
 * Analyse complète des records d'un joueur : séries, comparaisons au niveau au-dessus, tendance masse / 10 m (RC-3.5),
 * orientation (RC-5.5) et proposition de niveau. Fonction pure : la date du jour est un argument.
 */
export function analyzeRecords(profile: AnalysisProfile, records: readonly PerformanceRecord[], today: string): Analysis {
  const player: PlayerContext = { sex: profile.sex, line: lineOf(profile.position), level: profile.level }
  const weights = records.filter((r) => r.test === 'poids').sort(byDateAsc)
  // Force relative : dernier poids saisi, sinon poids du profil.
  const bodyweightKg = weights.length > 0 ? weights[weights.length - 1]!.value : profile.weightKg

  const groups = new Map<string, PerformanceRecord[]>()
  for (const r of [...records].sort(byDateAsc)) {
    const list = groups.get(seriesKey(r)) ?? []
    list.push(r)
    groups.set(seriesKey(r), list)
  }

  const series: Series[] = []
  for (const [key, history] of groups) {
    const latest = history[history.length - 1]!
    const def = getRecordTest(latest.test)
    const variant = latest.test === 'squat' ? (latest.variant ?? 'back-squat') : null
    series.push({
      key,
      test: latest.test,
      variant,
      label: variant === 'front-squat' ? 'Front squat' : variant === 'back-squat' ? 'Back squat' : def.label,
      history,
      latest,
      curve: history.map((r) => recordOneRepMax(r) ?? r.value),
      latestOneRepMax: recordOneRepMax(latest),
      lowerIsBetter: def.kind === 'time',
      comparison: compareRecord(player, latest, bodyweightKg),
    })
  }
  series.sort((a, b) => b.latest.date.localeCompare(a.latest.date) || a.key.localeCompare(b.key))

  const from = addDays(today, -7 * TREND_WINDOW_WEEKS)
  const massChange = windowChange(weights, from, today)
  const sprintChange = windowChange(
    records.filter((r) => r.test === 'sprint-10m'),
    from,
    today,
  )
  const massGainPct = massChange ? ((massChange.last - massChange.first) * 100) / massChange.first : null
  const sprint10Delta = sprintChange ? sprintChange.last - sprintChange.first : null

  const mass = compareMass(player, bodyweightKg)
  const comparisons = series.map((s) => s.comparison)
  return {
    bodyweightKg,
    series,
    mass,
    massGainPct,
    sprint10Delta,
    orientation: orient({ comparisons, mass, massGainPct, sprint10Delta }),
    levelProposal: proposeLevelUp(profile.level, comparisons),
  }
}


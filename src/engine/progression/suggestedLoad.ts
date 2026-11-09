import type { LoggedSet, PrescribedSet, SessionLog } from '../../types/plan'
import { recordExerciseId, type PerformanceRecord, type RecordTest } from '../../types/records'
import { addDays } from '../dates'
import {
  EPLEY_DIVISOR,
  LOAD_LOG_MAX_REPS,
  LOAD_LOG_WINDOW_WEEKS,
  LOAD_MIN_BARBELL_KG,
  LOAD_STEP_BARBELL_KG,
  LOAD_STEP_DUMBBELL_KG,
} from '../config'
import { atpOneRepMax, recordOneRepMax } from './oneRepMax'

/*
 * Charge conseillée d'un exercice, calculée depuis les max du joueur.
 * 1. Max de l'exercice lui-même : meilleur 1RM estimé des séances journalisées récentes.
 * 2. Sinon, max dérivé d'un record (squat, développé couché, soulevé de terre) par un rapport entre exercices.
 * La charge vise la prescription : reps + réserve (10 − RPE) donnent le % du max par Epley inversé.
 * Méthode ATP : quand la prescription donne un % du 1RM, le kg en découle directement (milieu de la fourchette), et le 1RM
 * vient en priorité du record converti selon les repères ATP (3RM / 0,90, 5RM / 0,84).
 */

export type LoadBase = Extract<RecordTest, 'squat' | 'developpe-couche' | 'souleve-de-terre'>

export interface LoadRatio {
  /** Record de référence. */
  base: LoadBase
  /** Max de l'exercice ≈ ratio × 1RM de référence (back squat, développé couché ou soulevé de terre). */
  ratio: number
  /** Haltères : charge par main. */
  implement: 'barre' | 'halteres'
  /** Repli quand le record de référence manque (ex. soulevé de terre ≈ 1,2 × squat). */
  fallback?: { base: LoadBase; ratio: number }
}

/**
 * Rapports entre exercices, ordres de grandeur de terrain (niveau C) : ils donnent un point de départ,
 * le journal du joueur prend le relais dès la première séance saisie.
 */
export const LOAD_RATIOS: Readonly<Record<string, LoadRatio>> = {
  'back-squat': { base: 'squat', ratio: 1, implement: 'barre' },
  'front-squat': { base: 'squat', ratio: 0.85, implement: 'barre' },
  'safety-bar-squat': { base: 'squat', ratio: 0.9, implement: 'barre' },
  'trap-bar-deadlift': { base: 'squat', ratio: 1.15, implement: 'barre' },
  'romanian-deadlift': { base: 'squat', ratio: 0.75, implement: 'barre' },
  'slow-romanian-deadlift': { base: 'squat', ratio: 0.65, implement: 'barre' },
  'good-morning': { base: 'squat', ratio: 0.45, implement: 'barre' },
  'hip-thrust': { base: 'squat', ratio: 1.1, implement: 'barre' },
  'power-clean': { base: 'squat', ratio: 0.6, implement: 'barre' },
  'hang-power-clean': { base: 'squat', ratio: 0.55, implement: 'barre' },
  'bulgarian-split-squat': { base: 'squat', ratio: 0.2, implement: 'halteres' },
  'walking-lunge': { base: 'squat', ratio: 0.17, implement: 'halteres' },
  'step-up': { base: 'squat', ratio: 0.15, implement: 'halteres' },
  'bench-press': { base: 'developpe-couche', ratio: 1, implement: 'barre' },
  'dumbbell-bench-press': { base: 'developpe-couche', ratio: 0.37, implement: 'halteres' },
  'overhead-press': { base: 'developpe-couche', ratio: 0.62, implement: 'barre' },
  'bent-over-row': { base: 'developpe-couche', ratio: 0.75, implement: 'barre' },
  // Méthode ATP
  deadlift: { base: 'souleve-de-terre', ratio: 1, implement: 'barre', fallback: { base: 'squat', ratio: 1.2 } },
  'push-press': { base: 'developpe-couche', ratio: 0.75, implement: 'barre' },
  'atg-lunge': { base: 'squat', ratio: 0.2, implement: 'halteres' },
  'back-rack-lunge': { base: 'squat', ratio: 0.45, implement: 'barre' },
  'rdl-barbell-row': { base: 'squat', ratio: 0.5, implement: 'barre' },
  'sumo-deadlift-high-pull': { base: 'squat', ratio: 0.45, implement: 'barre' },
  'incline-dumbbell-press': { base: 'developpe-couche', ratio: 0.33, implement: 'halteres' },
  'quadruped-row': { base: 'developpe-couche', ratio: 0.35, implement: 'halteres' },
  'single-arm-bench-one-foot': { base: 'developpe-couche', ratio: 0.3, implement: 'halteres' },
  'upright-row': { base: 'developpe-couche', ratio: 0.35, implement: 'barre' },
}

export const LOAD_BASE_LABEL: Record<LoadBase, string> = {
  squat: 'squat',
  'developpe-couche': 'développé couché',
  'souleve-de-terre': 'soulevé de terre',
}

/** Max du joueur : 1RM de référence (records, ramené au back squat) et 1RM estimé par exercice (journal). */
export interface PlayerMaxes {
  base: Partial<Record<LoadBase, number>>
  logged: Record<string, number>
  /** 1RM des records selon les repères ATP (3RM / 0,90, 5RM / 0,84), base des % du bloc force. Absent : base Epley. */
  atpBase?: Partial<Record<LoadBase, number>>
}

export interface SuggestedLoad {
  kg: number
  perHand: boolean
  /** Fraction du max visée (0-1). */
  pct: number
  /** Max utilisé, en kg. */
  maxKg: number
  /** Provenance lisible du max. */
  basis: string
}

/** % du 1RM pour `reps` répétitions avec `rir` en réserve : inverse d'Epley. */
export function percentOfMax(reps: number, rir: number): number {
  const total = reps + Math.max(0, rir)
  return total <= 1 ? 1 : 1 / (1 + total / EPLEY_DIVISOR)
}

/** 1RM estimé d'une série journalisée, réserve comprise ; null si inexploitable. */
export function loggedSetOneRepMax(set: Pick<LoggedSet, 'loadKg' | 'reps' | 'rpe'>): number | null {
  if (set.loadKg === null || !(set.loadKg > 0) || set.reps === null || set.reps < 1) return null
  const rir = set.rpe === null ? 0 : Math.max(0, 10 - set.rpe)
  const total = set.reps + rir
  if (total > LOAD_LOG_MAX_REPS) return null
  return total <= 1 ? set.loadKg : set.loadKg * (1 + total / EPLEY_DIVISOR)
}

const BASES: readonly LoadBase[] = ['squat', 'developpe-couche', 'souleve-de-terre']

/**
 * Max du joueur à une date : dernier record de squat (ramené au back squat), de développé couché et de soulevé de terre,
 * meilleur 1RM estimé par exercice des séances des `LOAD_LOG_WINDOW_WEEKS` dernières semaines.
 * `excludeSessionId` : la séance en cours ne nourrit pas ses propres charges conseillées.
 */
export function buildPlayerMaxes(
  records: readonly PerformanceRecord[],
  logs: readonly SessionLog[],
  today: string,
  excludeSessionId?: string,
): PlayerMaxes {
  const base: PlayerMaxes['base'] = {}
  const atpBase: NonNullable<PlayerMaxes['atpBase']> = {}
  const latest = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
  for (const test of BASES) {
    const r = latest.find((x) => x.test === test && x.date <= today)
    const oneRm = r ? recordOneRepMax(r) : null
    if (!r || oneRm === null || r.reps === null) continue
    const toBase = LOAD_RATIOS[recordExerciseId(r) ?? '']?.ratio ?? 1
    base[test] = oneRm / toBase
    atpBase[test] = atpOneRepMax(r.value, r.reps) / toBase
  }
  const from = addDays(today, -7 * LOAD_LOG_WINDOW_WEEKS)
  const logged: Record<string, number> = {}
  for (const log of logs) {
    if (log.sessionId === excludeSessionId || log.date < from || log.date > today) continue
    for (const set of log.sets) {
      const e1rm = loggedSetOneRepMax(set)
      if (e1rm !== null && e1rm > (logged[set.exerciseId] ?? 0)) logged[set.exerciseId] = e1rm
    }
  }
  return { base, logged, atpBase }
}

function roundDown(kg: number, step: number): number {
  return Math.floor(kg / step + 1e-9) * step
}

/** Max de référence d'un exercice d'après les records (avec le repli éventuel), ou null. */
function recordMax(ratio: LoadRatio | undefined, bases: Partial<Record<LoadBase, number>> | undefined): { kg: number; base: LoadBase } | null {
  if (!ratio || !bases) return null
  const own = bases[ratio.base]
  if (own !== undefined) return { kg: own * ratio.ratio, base: ratio.base }
  const fb = ratio.fallback ? bases[ratio.fallback.base] : undefined
  if (ratio.fallback && fb !== undefined) return { kg: fb * ratio.fallback.ratio, base: ratio.fallback.base }
  return null
}

function finalize(kg0: number, ratio: LoadRatio | undefined, pct: number, maxKg: number, basis: string): SuggestedLoad | null {
  const dumbbell = ratio?.implement === 'halteres'
  let kg = roundDown(kg0, dumbbell ? LOAD_STEP_DUMBBELL_KG : LOAD_STEP_BARBELL_KG)
  if (ratio?.implement === 'barre') kg = Math.max(LOAD_MIN_BARBELL_KG, kg)
  if (kg <= 0) return null
  return { kg, perHand: dumbbell, pct, maxKg, basis }
}

/**
 * Charge conseillée d'une prescription en répétitions ; null sans max connu ou sans charge.
 * Avec `pctOneRm` (méthode ATP) : kg = 1RM × milieu de la fourchette, arrondi vers le bas.
 */
export function suggestLoad(exerciseId: string, p: PrescribedSet, maxes: PlayerMaxes): SuggestedLoad | null {
  if (p.unit !== 'reps') return null
  const ratio = LOAD_RATIOS[exerciseId]
  const loggedMax = maxes.logged[exerciseId]

  if (p.pctOneRm) {
    const pct = (p.pctOneRm[0] + p.pctOneRm[1]) / 2
    const fromRecord = recordMax(ratio, maxes.atpBase ?? maxes.base)
    if (fromRecord) return finalize(fromRecord.kg * pct, ratio, pct, fromRecord.kg, `ton record de ${LOAD_BASE_LABEL[fromRecord.base]}`)
    if (loggedMax !== undefined) return finalize(loggedMax * pct, ratio, pct, loggedMax, 'tes dernières séances')
    return null
  }

  if (p.targetRpe === null) return null
  let maxKg: number
  let basis: string
  const fromRecord = recordMax(ratio, maxes.base)
  if (loggedMax !== undefined) {
    maxKg = loggedMax
    basis = 'tes dernières séances'
  } else if (fromRecord) {
    maxKg = fromRecord.kg
    basis = `ton record de ${LOAD_BASE_LABEL[fromRecord.base]}`
  } else {
    return null
  }
  const pct = percentOfMax(p.reps, 10 - p.targetRpe)
  return finalize(maxKg * pct, ratio, pct, maxKg, basis)
}

/**
 * Charge conseillée d'une série précise (`setIndex` à partir de 0). Sans vague : comme `suggestLoad`.
 * Vague : série au max = aucune charge imposée (null) ; back-off = fraction du top set saisi (`topSetKg`) ;
 * sinon % du 1RM de la série.
 */
export function suggestSetLoad(
  exerciseId: string,
  p: PrescribedSet,
  setIndex: number,
  maxes: PlayerMaxes,
  topSetKg: number | null = null,
): SuggestedLoad | null {
  const wave = p.waves?.[setIndex]
  if (!wave) return suggestLoad(exerciseId, p, maxes)
  if (wave.toMax) return null
  if (wave.pctTopSet) {
    if (topSetKg === null || !(topSetKg > 0)) return null
    const pct = (wave.pctTopSet[0] + wave.pctTopSet[1]) / 2
    return finalize(topSetKg * pct, LOAD_RATIOS[exerciseId], pct, topSetKg, 'ton top set du jour')
  }
  const single: PrescribedSet = { sets: 1, reps: wave.reps, unit: 'reps', targetRpe: wave.rpe ?? p.targetRpe }
  if (wave.pctOneRm) single.pctOneRm = wave.pctOneRm
  return suggestLoad(exerciseId, single, maxes)
}

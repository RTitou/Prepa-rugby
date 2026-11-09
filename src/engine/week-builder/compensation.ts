import { getWarmup, totalDurationMin } from '../../reference/activate/warmup'
import { getExercise } from '../../reference/exercises/library'
import { getMatchPeak } from '../../reference/exercises/positionEmphasis'
import type { PlanProfile, PlanReason, PrescribedExercise, Session } from '../../types/plan'
import {
  COMPENSATION_FULL_BLOCKS,
  COMPENSATION_FULL_DURATION_MIN,
  COMPENSATION_FULL_SPRINTS,
  COMPENSATION_SHORT_BLOCKS,
  COMPENSATION_SHORT_SPRINTS,
  MINUTES_FULL_MATCH,
  MINUTES_PARTIAL_MATCH,
} from '../config'
import type { CompensationKind, PlanContext } from '../context'
import { excludedExerciseSet } from './exclusions'

/*
 * Compensation après un match peu ou pas joué (§7.2 et §7.3 de la veille) : on rattrape la course à haute vitesse et le sprint,
 * jamais les collisions (choix de sécurité). Aucune étude de rugby à XV ne valide ces séances : à faire relire.
 */

/** Catégorie de participation d'après les minutes jouées. */
export type MinutesCategory = 'complet' | 'partiel' | 'peu'

/** §7.3 : 60 min ou plus = complet ; 20 à 59 = partiel ; moins de 20 ou pas joué = peu. */
export function classifyMinutes(minutes: number): MinutesCategory {
  if (minutes >= MINUTES_FULL_MATCH) return 'complet'
  if (minutes >= MINUTES_PARTIAL_MATCH) return 'partiel'
  return 'peu'
}

const SPRINT_POOL = ['sprint-fly-30m', 'sprint-10m', 'bike-sprint', 'rower-sprint']
const BLOCK_POOL = ['peak-blocks-run', 'intermittent-15-15', 'bike-intermittent', 'rower-intermittent']

function firstAvailable(pool: readonly string[], excluded: ReadonlySet<string>): string | null {
  return pool.find((id) => getExercise(id) !== undefined && !excluded.has(id)) ?? null
}

/** Sprints à 90-95 % de la vitesse maximale puis blocs intermittents calibrés sur les pics du poste. */
export function compensationExercises(kind: CompensationKind, profile: PlanProfile, context: PlanContext | undefined): PrescribedExercise[] {
  const excluded = excludedExerciseSet(context)
  const full = kind === 'complete'
  const sprints = full ? COMPENSATION_FULL_SPRINTS : COMPENSATION_SHORT_SPRINTS
  const blocks = full ? COMPENSATION_FULL_BLOCKS : COMPENSATION_SHORT_BLOCKS
  const out: PrescribedExercise[] = []

  const sprintId = firstAvailable(SPRINT_POOL, excluded)
  if (sprintId) {
    out.push({
      exerciseId: sprintId,
      block: 'vitesse',
      prescription: { sets: sprints, reps: 1, unit: 'reps', targetRpe: 8 },
      note: 'Sprints à 90-95 % de ta vitesse maximale, récupération complète entre chaque. Arrête-toi à la moindre douleur.',
    })
  }
  const blockId = firstAvailable(BLOCK_POOL, excluded)
  if (blockId) {
    const peak = getMatchPeak(profile.position, '1min')
    const calibrated = getExercise(blockId)?.peakCalibrated === true
    out.push({
      exerciseId: blockId,
      block: 'conditionnement',
      prescription: { sets: blocks, reps: 1, unit: 'min', targetRpe: 7 },
      ...(calibrated ? { note: `Vise environ ${peak.mean} m/min sur la minute, le pic d’un joueur de ton poste (à revérifier).` } : {}),
    })
  }
  return out
}

function reason(code: string, text: string): PlanReason {
  return { code, text, source: 'charge' }
}

export interface CompensationInput {
  date: string
  profile: PlanProfile
  context: PlanContext | undefined
  reasons?: PlanReason[]
}

/** Séance de compensation complète à MD+1 d'un joueur qui a peu ou pas joué (15-20 min). */
export function composeCompensation(input: CompensationInput): Session {
  const warmup = { version: 'court' as const, durationMin: totalDurationMin(getWarmup('court')) }
  const exercises = compensationExercises('complete', input.profile, input.context)
  return {
    id: `s-${input.date}-compensation`,
    date: input.date,
    kind: 'conditionnement',
    slot: 'compensation',
    title: 'Compensation du match',
    focus: 'sprints et intermittent, 15 à 20 min',
    durationMin: COMPENSATION_FULL_DURATION_MIN,
    maxRpe: 8,
    optional: false,
    warmup,
    exercises,
    accents: [],
    deload: false,
    status: 'prevue',
    logId: null,
    reasons: [
      ...(input.reasons ?? []),
      reason('compensation-md1', 'Tu as peu ou pas joué : courte séance de sprints et d’intermittent pour compenser la course rapide manquante, sans contacts.'),
      ...(input.context?.reasons ?? []),
      ...(input.context?.dayReasons?.[input.date] ?? []),
    ],
  }
}

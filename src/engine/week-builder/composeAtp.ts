import { getWarmup, totalDurationMin } from '../../reference/activate/warmup'
import { ATP_DAY_TITLES, atpBlocks } from '../../reference/atp/sessions'
import { ATP_LIFTS, offseasonStrength, type StrengthWeek } from '../../reference/atp/strength'
import type { AtpBlockDef, AtpDay, AtpItem } from '../../reference/atp/types'
import { getExercise } from '../../reference/exercises/library'
import { goalLabel, lineOf, type Sex } from '../../types/profile'
import type { RecordTest } from '../../types/records'
import type {
  AtpLift,
  BlockLetter,
  PlanProfile,
  PlanReason,
  PrescribedExercise,
  PrescribedSet,
  Session,
  SessionKind,
  SessionSlot,
  WaveSet,
} from '../../types/plan'
import type { PlanContext } from '../context'
import { ATP_BEGINNER_MAX_SET_RPE, ATP_DURATION_MIN } from '../config'
import { deloadSets } from '../progression/deload'
import { capRpe, startingLevel, type StartingLevel } from '../progression/level'
import { excludedExerciseSet } from './exclusions'
import { copenhagenItem, nordicItem } from '../prevention'

/*
 * Composition d'une séance de la méthode ATP (intersaison) depuis le référentiel reference/atp : blocs A à F, force en % du
 * 1RM et en vagues, supersets D/E, finisher F facultatif. Fonction pure et déterministe.
 */

export const ATP_SLOT_BY_DAY: Record<AtpDay, SessionSlot> = {
  lower: 'atp-lower',
  upper: 'atp-upper',
  conditioning: 'atp-conditioning',
  accessoire: 'atp-accessoire',
  terrain: 'atp-terrain',
  full: 'atp-full',
  recup: 'atp-recup',
}

/** RPE par défaut d'un exercice selon la lettre du bloc, quand le référentiel n'en donne pas. */
const DEFAULT_RPE: Record<BlockLetter, number | null> = { A: null, B: 7, C: 8, D: 8, E: 7, F: 7 }

const SESSION_KIND: Record<AtpDay, SessionKind> = {
  lower: 'muscu',
  upper: 'muscu',
  full: 'muscu',
  accessoire: 'muscu',
  conditioning: 'conditionnement',
  terrain: 'conditionnement',
  recup: 'recuperation',
}

export interface AtpComposeInput {
  date: string
  day: AtpDay
  /** Semaine du programme, 1 à 9. */
  week: number
  profile: PlanProfile
  context?: PlanContext
  reasons?: PlanReason[]
}

/** Paramètres de prescription communs (niveau, contexte, poste). */
export interface AtpPrescribeEnv {
  level: StartingLevel
  context?: PlanContext
  sex: Sex
  tight5: boolean
  /** Facteur de volume (contexte, décharge) appliqué aux séries. */
  factor: number
  excluded: ReadonlySet<string>
  /** Pas de série au max (séance à MD-2 ou plus près du match). */
  noMaxSets?: boolean
  /** Plafond des % du 1RM (débutant en saison). */
  pctCap?: number
}

export function atpEnv(profile: PlanProfile, context: PlanContext | undefined, deload = false): AtpPrescribeEnv {
  const f = context?.volumeFactor === undefined ? 1 : Math.min(1, Math.max(0.2, context.volumeFactor))
  return {
    level: startingLevel(profile.liftingExperience),
    ...(context ? { context } : {}),
    sex: profile.sex,
    tight5: profile.position <= 5,
    factor: f * (deload ? 0.6 : 1),
    excluded: excludedExerciseSet(context),
  }
}

/** RPE plafonné par le niveau et par le contexte (alerte de ressenti, mode récupération). */
export function atpRpe(env: AtpPrescribeEnv, raw: number): number {
  return capRpe(env.level, Math.min(raw, env.context?.maxTargetRpe ?? Infinity))
}

function scaledSets(env: AtpPrescribeEnv, sets: number): number {
  return env.factor < 1 ? deloadSets(sets, env.factor) : sets
}

/** Exercice prescrit depuis un élément du référentiel ATP. */
export function atpItemExercise(env: AtpPrescribeEnv, item: AtpItem, block: AtpBlockDef): PrescribedExercise {
  const baseSets = env.tight5 && item.setsTight5 !== undefined ? item.setsTight5 : item.sets
  // L'échauffement (A) garde ses 3 tours ; le volume réduit touche les autres blocs.
  const sets = block.letter === 'A' ? baseSets : scaledSets(env, baseSets)
  const rawRpe = item.rpe === undefined ? DEFAULT_RPE[block.letter] : item.rpe
  const prescription: PrescribedSet = {
    sets,
    reps: item.reps,
    unit: item.unit ?? 'reps',
    targetRpe: rawRpe === null ? null : atpRpe(env, rawRpe),
  }
  if (item.repsMax !== undefined) prescription.repsMax = item.repsMax
  if (item.perSide) prescription.perSide = true
  const notes = [item.note, item.noteBySex?.[env.sex]].filter((n): n is string => Boolean(n))
  const out: PrescribedExercise = { exerciseId: item.id, block: block.kind, prescription, group: block.letter }
  if (notes.length) out.note = notes.join(' ')
  if (block.restSec) out.restSec = block.restSec
  if (block.optional) out.optional = true
  return out
}

/**
 * Une série au max devient une série fixe pour un débutant, sous plafond de RPE (alerte) ou près du match (`noMaxSets`) :
 * mêmes répétitions à RPE 8 au plus.
 */
function adaptWave(env: AtpPrescribeEnv, wave: WaveSet): WaveSet {
  const beginner = env.level.experience === 'moins-6-mois'
  const capped = (env.context?.maxTargetRpe ?? Infinity) < 9
  let out = wave
  if (wave.toMax && (beginner || capped || env.noMaxSets)) out = { reps: wave.reps, pctOneRm: null, rpe: atpRpe(env, ATP_BEGINNER_MAX_SET_RPE) }
  if (env.pctCap !== undefined && out.pctOneRm) out = { ...out, pctOneRm: capPct(out.pctOneRm, env.pctCap) }
  return out
}

function capPct(range: [number, number], cap: number): [number, number] {
  return [Math.min(range[0], cap), Math.min(range[1], cap)]
}

/** Bloc C : mouvement de force prescrit selon le schéma de la semaine. */
export function strengthExercise(
  env: AtpPrescribeEnv,
  lift: AtpLift,
  sw: StrengthWeek,
  letter: BlockLetter,
  testReps?: number,
  exerciseId: string = ATP_LIFTS[lift].exerciseId,
): PrescribedExercise {
  const id = exerciseId
  const beginner = env.level.experience === 'moins-6-mois'
  let prescription: PrescribedSet
  let note = sw.note
  const s = sw.scheme
  if (s.kind === 'test') {
    const reps = beginner ? 5 : (testReps ?? 5)
    prescription = { sets: 1, reps, unit: 'reps', targetRpe: atpRpe(env, 10) }
    note = beginner
      ? `${note} Débutant : test de 5RM seulement.`
      : testReps !== undefined
        ? `${note} Refais ${testReps} répétitions comme en semaine 1.`
        : `${note} 5RM par défaut, 3RM ou 1RM si tu as l’habitude.`
  } else if (s.kind === 'sets') {
    const pct = env.pctCap !== undefined ? capPct(s.pct, env.pctCap) : s.pct
    prescription = { sets: scaledSets(env, s.sets), reps: s.reps, unit: 'reps', targetRpe: atpRpe(env, sw.rpe ?? 9), pctOneRm: pct }
  } else {
    let waves = s.waves.map((w) => adaptWave(env, w))
    if (env.factor < 1) waves = waves.slice(0, deloadSets(waves.length, env.factor))
    prescription = { sets: waves.length, reps: waves[0]!.reps, unit: 'reps', targetRpe: atpRpe(env, sw.rpe ?? 9), waves }
  }
  return { exerciseId: id, block: s.kind === 'test' ? 'test' : 'force', prescription, group: letter, restSec: sw.restSec, note }
}

function sessionReasons(input: AtpComposeInput): PlanReason[] {
  return [
    ...(input.reasons ?? []),
    { code: 'intersaison', text: `Intersaison · semaine ${input.week} sur 9 (méthode ATP).`, source: 'moteur' },
    ...(input.context?.reasons ?? []),
    ...(input.context?.dayReasons?.[input.date] ?? []),
  ]
}

function durationOf(day: AtpDay, week: number): number {
  const testWeek = week === 1 || week === 9
  switch (day) {
    case 'lower':
    case 'upper':
    case 'full':
      return testWeek ? ATP_DURATION_MIN.test : ATP_DURATION_MIN.salle
    case 'terrain':
      return ATP_DURATION_MIN.terrain
    case 'conditioning':
      return ATP_DURATION_MIN.conditioning
    case 'accessoire':
      return ATP_DURATION_MIN.accessoire + ATP_DURATION_MIN.velo
    case 'recup':
      return ATP_DURATION_MIN.recup
  }
}

/**
 * Intersaison : le programme ATP reste fixe, seul l'objectif principal ajoute une série au bloc qui le travaille
 * (puissance : B en salle ; explosivité : B et C du terrain ; force / hypertrophie : D en salle ; endurance : bloc principal du
 * conditioning et vélo plus long à l'accessoire). Les tests (S1, S9) et les finishers facultatifs ne changent pas.
 * Modifie `exercises` en place et renvoie la raison à afficher, ou null.
 */
function applyAtpGoal(exercises: PrescribedExercise[], day: AtpDay, profile: PlanProfile): PlanReason | null {
  const goal = profile.goals?.primary
  if (!goal) return null
  const gym = day === 'lower' || day === 'upper' || day === 'full'
  const target = (e: PrescribedExercise): boolean => {
    if (e.optional || e.block === 'test' || e.group === 'A') return false
    if (goal === 'puissance') return gym && e.group === 'B'
    if (goal === 'explosivite') return day === 'terrain' && (e.group === 'B' || e.group === 'C')
    if (goal === 'force-hypertrophie') return gym && e.group === 'D'
    return day === 'conditioning' && e.group === 'B'
  }
  let changed = false
  for (let i = 0; i < exercises.length; i++) {
    const e = exercises[i]!
    if (target(e)) {
      exercises[i] = { ...e, prescription: { ...e.prescription, sets: e.prescription.sets + 1 } }
      changed = true
    } else if (goal === 'endurance' && day === 'accessoire' && e.exerciseId === 'easy-bike' && e.prescription.unit === 'min') {
      exercises[i] = { ...e, prescription: { ...e.prescription, reps: 45 } }
      changed = true
    }
  }
  return changed
    ? { code: 'objectif-principal', text: `Objectif principal (${goalLabel(goal)}) : une série de plus sur le bloc qui le travaille.`, source: 'moteur' }
    : null
}

/** Compose la séance ATP du jour. */
export function composeAtp(input: AtpComposeInput): Session {
  const { day, week, profile } = input
  const env = atpEnv(profile, input.context)
  const line = lineOf(profile.position)
  const beginner = env.level.experience === 'moins-6-mois'
  const exercises: PrescribedExercise[] = []
  const used = new Set<string>()
  const tests: RecordTest[] = []

  for (const block of atpBlocks(day, week)) {
    // Débutant : pas de finisher (RC-5.1, technique d'abord).
    if (block.optional && block.kind === 'finisher' && beginner) continue
    if (block.tests) tests.push(...block.tests)
    if (block.strengthLift) {
      const lift = block.strengthLift
      exercises.push(strengthExercise(env, lift, offseasonStrength(week, lift, profile.liftingExperience), block.letter, week === 9 ? profile.testReps?.[lift] : undefined))
      used.add(ATP_LIFTS[lift].exerciseId)
      if (week === 1 || week === 9) tests.push(lift)
    }
    for (const item of block.items) {
      if (item.line && item.line !== line) continue
      if (item.weeks && !item.weeks.includes(week)) continue
      if (used.has(item.id) || env.excluded.has(item.id) || !getExercise(item.id)) continue
      used.add(item.id)
      exercises.push(atpItemExercise(env, item, block))
    }
  }

  // Prévention en présaison (Harøy 2019 : Copenhague 3 fois par semaine ; van Dyk 2019 : Nordic) : lower, upper et full body.
  const prevention =
    day === 'lower'
      ? [nordicItem(profile.liftingExperience), copenhagenItem(profile.liftingExperience)]
      : day === 'upper'
        ? [copenhagenItem(profile.liftingExperience)]
        : day === 'full'
          ? [nordicItem(profile.liftingExperience), copenhagenItem(profile.liftingExperience)]
          : []
  for (const p of prevention) {
    if (used.has(p.exerciseId) || env.excluded.has(p.exerciseId) || !getExercise(p.exerciseId)) continue
    used.add(p.exerciseId)
    const prescription = { ...p.prescription, targetRpe: p.prescription.targetRpe === null ? null : atpRpe(env, p.prescription.targetRpe) }
    // Avant le finisher facultatif, à la fin du travail obligatoire.
    const at = exercises.findIndex((e) => e.optional)
    const item: PrescribedExercise = { exerciseId: p.exerciseId, block: 'prevention', prescription, group: 'E', restSec: [60, 90], note: p.note }
    if (at === -1) exercises.push(item)
    else exercises.splice(at, 0, item)
  }

  const goalReason = applyAtpGoal(exercises, day, profile)
  const rpes = exercises.filter((e) => !e.optional).map((e) => e.prescription.targetRpe).filter((r): r is number => r !== null)
  const meta = ATP_DAY_TITLES[day]
  const warmupProg = getWarmup('court')
  const session: Session = {
    id: `s-${input.date}-${ATP_SLOT_BY_DAY[day]}`,
    date: input.date,
    kind: SESSION_KIND[day],
    slot: ATP_SLOT_BY_DAY[day],
    title: `${meta.title} · S${week}/9`,
    focus: week === 1 || week === 9 ? (day === 'accessoire' || day === 'recup' ? meta.focus : 'tests') : meta.focus,
    durationMin: durationOf(day, week),
    maxRpe: rpes.length ? Math.max(...rpes) : null,
    optional: day === 'accessoire' || day === 'recup',
    warmup: { version: 'court', durationMin: totalDurationMin(warmupProg) },
    exercises,
    accents: [],
    deload: false,
    status: 'prevue',
    logId: null,
    reasons: [...sessionReasons(input), ...(goalReason ? [goalReason] : [])],
    programWeek: week,
  }
  const uniqueTests = [...new Set(tests)]
  if (uniqueTests.length) session.tests = uniqueTests
  return session
}

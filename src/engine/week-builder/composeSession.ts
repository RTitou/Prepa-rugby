import { getWarmup, totalDurationMin } from '../../reference/activate/warmup'
import { getExercise } from '../../reference/exercises/library'
import { getMatchPeak, getPositionEmphasis } from '../../reference/exercises/positionEmphasis'
import type {
  BlockKind,
  PlanProfile,
  PlanReason,
  PrescribedExercise,
  PrescribedSet,
  Session,
  SessionSlot,
  WarmupVersion,
} from '../../types/plan'
import type { OrientationFocus, PlanContext } from '../context'
import {
  ACTIVATION_DURATION_MIN,
  COMPENSATION_SHORT_DURATION_MIN,
  CONDITIONING_DURATION_MIN,
  DELOAD_VOLUME_FACTOR,
  LIGHT_CONDITIONING_AEROBIC_MIN,
  MAX_ACCENT_BLOCKS_PER_SESSION,
  MINUTES_PER_SET,
  ORIENT_FORCE_EXTRA_SETS,
  ORIENT_HYPERTROPHY_REPS,
  ORIENT_HYPERTROPHY_REPS_MAX,
  ORIENT_HYPERTROPHY_RPE,
  ORIENT_HYPERTROPHY_SETS,
  ORIENT_POWER_EXTRA_SETS,
  RECOVERY_DURATION_MIN,
  SCHEMES,
  SPEED_EXERCISES,
  SPEED_REPS_DEFAULT,
  SPEED_REPS_PRIORITY,
  TIMED_EXERCISES,
  type Scheme,
  type SchemeKind,
} from '../config'
import { deloadRpe, deloadSets } from '../progression/deload'
import { capRpe, startingLevel, type StartingLevel } from '../progression/level'
import { compensationExercises, composeCompensation } from './compensation'
import { excludedExerciseSet } from './exclusions'
import { ACCENT_RULES, RECOVERY_AEROBIC_POOL, RECOVERY_MOBILITY, templateFor, type AccentRule } from './templates'
import { atpActivation, atpBlocks } from '../../reference/atp/sessions'
import { seasonStrength } from '../../reference/atp/strength'
import type { AtpBlockDef } from '../../reference/atp/types'
import type { BlockLetter } from '../../types/plan'
import { goalLabel, type TrainingGoal } from '../../types/profile'
import { seasonWaveWeek } from '../progression/strengthWave'
import { seasonPrevention } from '../prevention'
import { atpEnv, atpItemExercise, strengthExercise, type AtpPrescribeEnv } from './composeAtp'

export interface ComposeInput {
  date: string
  slot: SessionSlot
  /** Rang de la séance parmi celles de la semaine (0 = première) : lettre A/B/C et variante. */
  index: number
  profile: PlanProfile
  /** Numéro de semaine ISO : fait alterner les variantes d'exercices d'une semaine à l'autre. */
  rotation: number
  /** Semaine allégée (RC-5.3). */
  deload: boolean
  /** Ajoute le rappel de vitesse maximale en tête de séance (RC-4.4). */
  includeSpeed: boolean
  context?: PlanContext
  /** Raisons de placement fournies par buildWeek. */
  reasons?: PlanReason[]
  /** Rang de la semaine dans le cycle de charge : semaine de la vague de force ATP (défaut 0, semaine 1). */
  cycleIndex?: number
  /** Jours avant le prochain match (null sans match proche) : à 2 jours ou moins, ni série au max ni finisher crosstraining. */
  toNextMatch?: number | null
  /** Conditionnement en sprints répétés (second conditionnement de l'objectif endurance). */
  repeatedSprints?: boolean
}

const LETTERS = ['A', 'B', 'C', 'D']

function reason(code: string, text: string): PlanReason {
  return { code, text, source: 'moteur' }
}

export function sessionId(date: string, slot: SessionSlot): string {
  return `s-${date}-${slot}`
}

/** Date et gabarit portés par un identifiant de séance (`s-AAAA-MM-JJ-<slot>`), ou null s'il est mal formé. */
export function parseSessionId(id: string): { date: string; slot: string } | null {
  const m = /^s-(\d{4}-\d{2}-\d{2})-([a-z-]+)$/.exec(id)
  return m ? { date: m[1]!, slot: m[2]! } : null
}

function warmupFor(version: WarmupVersion): Session['warmup'] {
  return { version, durationMin: totalDurationMin(getWarmup(version)) }
}

function roundUp5(n: number): number {
  return Math.ceil(n / 5) * 5
}

/** Volume effectif : semaine allégée et facteur du contexte (phase 5) se cumulent. */
function volumeFactor(deload: boolean, context: PlanContext | undefined): number {
  const f = context?.volumeFactor === undefined ? 1 : Math.min(1, Math.max(0.2, context.volumeFactor))
  return (deload ? DELOAD_VOLUME_FACTOR : 1) * f
}

/** Raisons que le contexte ajoute à toute séance de la date : celles de la semaine, puis celles du jour. */
function contextReasons(input: ComposeInput): PlanReason[] {
  return [...(input.context?.reasons ?? []), ...(input.context?.dayReasons?.[input.date] ?? [])]
}

interface Built {
  exercise: PrescribedExercise
  kind: SchemeKind | 'vitesse'
}

class Builder {
  readonly used = new Set<string>()
  readonly items: Built[] = []
  readonly excluded: ReadonlySet<string>
  readonly level: StartingLevel
  readonly factor: number

  constructor(
    private readonly input: ComposeInput,
  ) {
    this.excluded = excludedExerciseSet(input.context)
    this.level = startingLevel(input.profile.liftingExperience)
    this.factor = volumeFactor(input.deload, input.context)
  }

  /** RPE cible plafonné par le niveau et, sous alerte ou en mode récupération, par le plafond du contexte (RC-6.4). */
  rpe(raw: number): number {
    return capRpe(this.level, Math.min(raw, this.input.context?.maxTargetRpe ?? Infinity))
  }

  /** Premier candidat utilisable ; les listes rotatives avancent avec la semaine. */
  pick(pool: readonly string[], rotate: boolean, offset: number): string | null {
    const available = pool.filter((id) => getExercise(id) !== undefined && !this.used.has(id) && !this.excluded.has(id))
    if (available.length === 0) return null
    return available[rotate ? (this.input.rotation + offset) % available.length : 0]!
  }

  prescription(id: string, scheme: Scheme, setsDelta = 0): PrescribedSet {
    const baseSets = Math.max(1, scheme.sets + setsDelta)
    const sets = this.factor < 1 ? deloadSets(baseSets, this.factor) : baseSets
    const rpe0 = this.input.deload ? deloadRpe(scheme.rpe) : scheme.rpe
    const timed = TIMED_EXERCISES[id]
    const base: PrescribedSet = timed
      ? { sets, reps: timed[this.level.experience], unit: 's', targetRpe: this.rpe(rpe0) }
      : { sets, reps: scheme.reps, unit: 'reps', targetRpe: this.rpe(rpe0) }
    if (!timed && scheme.repsMax !== undefined) base.repsMax = scheme.repsMax
    return base
  }

  add(id: string, block: BlockKind, kind: SchemeKind, scheme: Scheme, opts: { setsDelta?: number; first?: boolean } = {}): void {
    this.used.add(id)
    const built: Built = {
      exercise: { exerciseId: id, block, prescription: this.prescription(id, scheme, opts.setsDelta) },
      kind,
    }
    if (opts.first) {
      const speedCount = this.items.filter((i) => i.exercise.block === 'vitesse').length
      this.items.splice(speedCount, 0, built)
    } else {
      this.items.push(built)
    }
  }

  get exercises(): PrescribedExercise[] {
    return this.items.map((i) => i.exercise)
  }

  /** Minutes estimées des exercices. */
  get workMinutes(): number {
    return this.items.reduce((sum, i) => {
      const per = i.kind === 'vitesse' ? 1.5 : MINUTES_PER_SET[i.kind]
      return sum + i.exercise.prescription.sets * per
    }, 0)
  }
}

function addSpeed(b: Builder, priority: boolean): void {
  const id = b.pick(SPEED_EXERCISES, false, 0)
  if (!id) return
  b.used.add(id)
  const sets = priority ? SPEED_REPS_PRIORITY : SPEED_REPS_DEFAULT
  const scaled = b.factor < 1 ? deloadSets(sets, b.factor) : sets
  b.items.push({
    kind: 'vitesse',
    exercise: {
      exerciseId: id,
      block: 'vitesse',
      prescription: { sets: scaled, reps: 1, unit: 'reps', targetRpe: b.rpe(9) },
      note: 'Vitesse quasi maximale (plus de 90 % de ta vitesse max), récupération complète de 1 à 2 minutes entre les sprints.',
    },
  })
}

/**
 * Effet de l'orientation (RC-5.5) sur une prescription du gabarit :
 * - force : une série de plus sur les exercices principaux ;
 * - hypertrophie : 3-4 séries de 8 à 12 sur le secondaire et l'accessoire ;
 * - puissance-vitesse : une série de plus sur la puissance (et plus de sprints, voir composeMuscu) ;
 * - vitesse : uniquement plus de sprints.
 */
function orientedScheme(focus: OrientationFocus | undefined, kind: SchemeKind, exerciseId: string, scheme: Scheme): { scheme: Scheme; setsDelta: number } {
  if (focus === 'force' && kind === 'principal') return { scheme, setsDelta: ORIENT_FORCE_EXTRA_SETS }
  if (focus === 'puissance-vitesse' && kind === 'puissance') return { scheme, setsDelta: ORIENT_POWER_EXTRA_SETS }
  if (focus === 'hypertrophie' && (kind === 'secondaire' || kind === 'accessoire') && !TIMED_EXERCISES[exerciseId]) {
    return {
      scheme: {
        sets: ORIENT_HYPERTROPHY_SETS[kind],
        reps: ORIENT_HYPERTROPHY_REPS,
        repsMax: ORIENT_HYPERTROPHY_REPS_MAX,
        rpe: ORIENT_HYPERTROPHY_RPE,
      },
      setsDelta: 0,
    }
  }
  return { scheme, setsDelta: 0 }
}

function composeMuscu(input: ComposeInput): Session {
  const orientation = input.context?.orientation
  const b = new Builder(input)
  const emphasis = getPositionEmphasis(input.profile.position)
  const accents: string[] = []

  const speedOriented = orientation?.focus === 'vitesse' || orientation?.focus === 'puissance-vitesse'
  const speedPriority = speedOriented || emphasis.priorities.some((p) => p.category === 'vitesse' && p.weight === 'prioritaire')
  if (input.includeSpeed) {
    addSpeed(b, speedPriority)
    if (speedPriority) accents.push('Vitesse')
  }

  // Accents de poste : calculés avant le gabarit pour que les blocs « première position » passent devant.
  const pending: { rule: AccentRule; weight: string }[] = []
  for (const item of emphasis.priorities) {
    const rule = ACCENT_RULES[item.category]
    if (!rule || !rule.slots.includes(input.slot)) continue
    if (item.weight !== 'prioritaire' && !rule.includeRenforce) continue
    pending.push({ rule, weight: item.weight })
  }
  const accentRules = pending.slice(0, MAX_ACCENT_BLOCKS_PER_SESSION)

  // Blocs de tête des accents (puissance), puis gabarit, puis autres accents.
  const applyAccent = (entry: { rule: AccentRule; weight: string }) => {
    const rule = entry.rule
    const id = b.pick(rule.pool(b.level), false, 0)
    if (!id) return
    const scheme = typeof rule.scheme === 'string' ? SCHEMES[input.profile.liftingExperience][rule.scheme] : rule.scheme
    const kind: SchemeKind = typeof rule.scheme === 'string' ? rule.scheme : 'accessoire'
    b.add(id, rule.block, kind, scheme, { setsDelta: entry.weight === 'prioritaire' ? 0 : -1, first: rule.first })
    accents.push(rule.label)
  }
  accentRules.filter((e) => e.rule.first).forEach(applyAccent)

  templateFor(input.slot, input.index).forEach((spec, i) => {
    if (spec.when && !spec.when(b.level)) return
    const id = b.pick(spec.pool, spec.rotate === true, i)
    if (!id) return
    const oriented = orientedScheme(orientation?.focus, spec.scheme, id, SCHEMES[input.profile.liftingExperience][spec.scheme])
    b.add(id, spec.block, spec.scheme, oriented.scheme, { setsDelta: oriented.setsDelta })
  })

  accentRules.filter((e) => !e.rule.first).forEach(applyAccent)

  const goalReasons = applyGoals(b, input)
  // Prévention ischios / adducteurs (van Dyk 2019, Harøy 2019) : une fois par semaine chacun, sauf si la séance en a déjà.
  const hasEccentricHamstring = b.items.some((i) => getExercise(i.exercise.exerciseId)?.category === 'ischios-excentrique')
  for (const p of seasonPrevention(input.slot, input.index, input.profile.liftingExperience)) {
    if (p.exerciseId.startsWith('nordic') && hasEccentricHamstring) continue
    if (b.used.has(p.exerciseId) || b.excluded.has(p.exerciseId) || !getExercise(p.exerciseId)) continue
    b.used.add(p.exerciseId)
    const sets = b.factor < 1 ? deloadSets(p.prescription.sets, b.factor) : p.prescription.sets
    b.items.push({
      kind: 'accessoire',
      exercise: {
        exerciseId: p.exerciseId,
        block: 'prevention',
        prescription: { ...p.prescription, sets, targetRpe: p.prescription.targetRpe === null ? null : b.rpe(p.prescription.targetRpe) },
        note: p.note,
      },
    })
  }
  const atp = structureAtp(b, input)

  const level = b.level
  const letter = LETTERS[input.index] ?? String(input.index + 1)
  const focusBySlot: Partial<Record<SessionSlot, string>> = {
    'bas-force': 'force bas du corps',
    haut: 'haut du corps',
    puissance: 'puissance',
    'corps-entier': level.fullBody ? 'corps entier, technique' : 'corps entier',
  }
  const focus = focusBySlot[input.slot] ?? ''
  const warmup = warmupFor('complet')
  const reasons: PlanReason[] = [...(input.reasons ?? [])]
  if (input.deload) {
    reasons.push(reason('deload', 'Semaine allégée : volume réduit pour récupérer (une semaine sur cinq).'))
  }
  if (input.includeSpeed) reasons.push(reason('rappel-vitesse', 'Rappel de vitesse maximale : ton club n’en fait pas.'))
  if (orientation) reasons.push({ code: `orientation-${orientation.focus}`, text: orientation.reason, source: 'records' })
  reasons.push(...goalReasons)
  reasons.push(...contextReasons(input))

  const rpes = atp.exercises.filter((e) => !e.optional).map((e) => e.prescription.targetRpe).filter((r): r is number => r !== null)
  return {
    id: sessionId(input.date, input.slot),
    date: input.date,
    kind: 'muscu',
    slot: input.slot,
    title: `Muscu ${letter} · ${focus}`,
    focus,
    durationMin: roundUp5(warmup.durationMin + atp.minutes),
    maxRpe: rpes.length ? Math.max(...rpes) : null,
    optional: false,
    warmup,
    exercises: atp.exercises,
    accents,
    deload: input.deload,
    status: 'prevue',
    logId: null,
    reasons,
  }
}

/**
 * Objectifs du joueur (principal, secondaire) appliqués à une séance de musculation en saison. Choix de conception :
 * - puissance : un exercice de puissance de plus en B (épaulé, squat sauté, lancer) ; principal : +1 série sur tout le bloc B ;
 * - explosivité : un exercice pliométrique ou réactif en B (pogos, CMJ, box jump) ; principal : +1 série sur tout le bloc B ;
 * - force / hypertrophie : renforcement en 8-12 répétitions (4 séries en principal, 3 en secondaire) ; principal : +1 série en C ;
 * - endurance : intermittent 15 s / 15 s en fin de séance (2 × 6 min en principal, 1 × 6 min en secondaire), et un
 *   conditionnement de plus en semaine sans match (voir buildWeek).
 * Renvoie les raisons à afficher.
 */
function applyGoals(b: Builder, input: ComposeInput): PlanReason[] {
  const goals = input.profile.goals
  if (!goals) return []
  const reasons: PlanReason[] = []
  const experience = input.profile.liftingExperience
  const list: { goal: TrainingGoal; primary: boolean }[] = [{ goal: goals.primary, primary: true }]
  if (goals.secondary) list.push({ goal: goals.secondary, primary: false })
  for (const { goal, primary } of list) {
    const rank = primary ? 'principal' : 'secondaire'
    switch (goal) {
      case 'puissance':
      case 'explosivite': {
        const pool =
          goal === 'puissance'
            ? b.level.fullBody
              ? ['med-ball-slam', 'box-jump', 'med-ball-chest-throw']
              : ['hang-power-clean', 'jump-squat', 'med-ball-slam', 'box-jump']
            : ['pogo-jumps', 'countermovement-jump', 'box-jump', 'lateral-pogo']
        const id = b.pick(pool, false, 0)
        if (id) b.add(id, 'puissance', 'puissance', SCHEMES[experience].puissance, { setsDelta: primary ? 0 : -1, first: true })
        // Cormie 2011, Suchomel 2018 : la puissance repose sur la force ; un débutant développe d'abord sa force
        // (série de plus sur le mouvement roi, voir structureAtp), les autres ajoutent une série au bloc puissance.
        if (primary && !b.level.fullBody) for (const item of b.items) if (item.kind === 'puissance') item.exercise.prescription.sets += 1
        const effect =
          primary && b.level.fullBody
            ? 'un exercice simple de puissance, et d’abord de la force : une série de plus sur le mouvement principal.'
            : goal === 'puissance'
              ? 'travail de puissance ajouté en début de séance, récupération complète.'
              : 'sauts réactifs ajoutés en début de séance, récupération complète.'
        reasons.push(goalReason(rank, goal, effect))
        break
      }
      case 'force-hypertrophie': {
        for (const item of b.items) {
          if ((item.kind !== 'secondaire' && item.kind !== 'accessoire') || TIMED_EXERCISES[item.exercise.exerciseId]) continue
          const p = item.exercise.prescription
          if (p.unit !== 'reps') continue
          item.exercise.prescription = {
            ...p,
            sets: Math.max(p.sets, b.factor < 1 ? deloadSets(primary ? 4 : 3, b.factor) : primary ? 4 : 3),
            reps: ORIENT_HYPERTROPHY_REPS,
            repsMax: ORIENT_HYPERTROPHY_REPS_MAX,
            targetRpe: b.rpe(8),
          }
        }
        reasons.push(goalReason(rank, goal, primary ? 'une série lourde de plus et du volume en 8 à 12 répétitions.' : 'renforcement en 8 à 12 répétitions.'))
        break
      }
      case 'endurance': {
        // Wilson 2012 : en entraînement concurrent, la course gêne plus la force et l'hypertrophie que le vélo ;
        // le cardio ajouté après la musculation se fait donc de préférence à vélo (course réservée au conditionnement).
        const id = b.pick(['bike-intermittent', 'rower-intermittent', 'intermittent-15-15'], false, 0)
        if (id) {
          b.used.add(id)
          const sets = primary ? 2 : 1
          b.items.push({
            kind: 'accessoire',
            exercise: {
              exerciseId: id,
              block: 'conditionnement',
              prescription: { sets: b.factor < 1 ? deloadSets(sets, b.factor) : sets, reps: 6, unit: 'min', targetRpe: b.rpe(8) },
              note: 'Fin de séance, à vélo de préférence : blocs de 6 min en 15 s vite / 15 s facile, 2 min de récupération entre les blocs.',
            },
          })
        }
        reasons.push(goalReason(rank, goal, primary ? 'cardio en fin de séance et un conditionnement de plus les semaines sans match.' : 'cardio en fin de séance.'))
        break
      }
    }
  }
  return reasons
}

function goalReason(rank: 'principal' | 'secondaire', goal: TrainingGoal, effect: string): PlanReason {
  return { code: `objectif-${rank}`, text: `Objectif ${rank} (${goalLabel(goal)}) : ${effect}`, source: 'moteur' }
}

/** Minutes du bloc A (3 tours d'activation ATP après l'Activate). Estimation de conception. */
const ATP_ACTIVATION_MIN = 6
/** Récupération par défaut d'un bloc, en secondes. */
/**
 * B : 2 à 3 min pour la puissance et la pliométrie (ACSM 2002 : charges légères et rapides, 2-3 min ; Suchomel 2018 : 2-5 min ;
 * pliométrie et changements de direction, meilleurs avec ≥ 120 s). C : 2-3 min (Grgic 2018 : > 2 min chez les entraînés).
 * D/E : 60-120 s (Schoenfeld 2024 : léger avantage hypertrophie au-delà de 60 s).
 */
const DEFAULT_REST: Record<BlockLetter, [number, number] | undefined> = { A: undefined, B: [120, 180], C: [120, 180], D: [60, 120], E: [60, 120], F: [60, 120] }
const LETTER_ORDER: Record<BlockLetter, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 }
/** Bloc de 3 semaines ATP qui fournit l'activation et le finisher en saison, alterné d'une semaine ISO à l'autre. */
const SEASON_ACTIVATION_WEEKS = [2, 5, 8] as const

function atpKindForSlot(slot: SessionSlot): 'lower' | 'upper' | 'full' {
  return slot === 'bas-force' ? 'lower' : slot === 'haut' ? 'upper' : 'full'
}

/**
 * Structure ATP d'une séance de musculation en saison (phase 3 de la méthode ATP) :
 * A activation en 3 tours propre au slot (après l'Activate complet), B puissance et vitesse, C un seul mouvement roi en vague
 * de force (cycle de 5 semaines, 5ᵉ = décharge), D/E supersets de 2 à 3 exercices, F finisher facultatif.
 * Le placement et le choix des exercices restent ceux du gabarit ; seuls les lettres, le bloc C et les blocs A/F changent.
 * À 2 jours ou moins du match : ni série au max ni finisher. Débutant : % plafonnés à 80 %, pas de série au max, pas de finisher.
 */
function structureAtp(b: Builder, input: ComposeInput): { exercises: PrescribedExercise[]; minutes: number } {
  const nearMatch = input.toNextMatch !== undefined && input.toNextMatch !== null && input.toNextMatch <= 2
  const beginner = b.level.fullBody
  const env: AtpPrescribeEnv = {
    ...atpEnv(input.profile, input.context),
    excluded: b.excluded,
    ...(nearMatch ? { noMaxSets: true } : {}),
    ...(beginner ? { pctCap: 0.8 } : {}),
  }
  const strength = seasonStrength(seasonWaveWeek(input.cycleIndex ?? 0, input.deload), input.profile.liftingExperience)
  const used = new Set(b.items.map((i) => i.exercise.exerciseId))

  let cDone = false
  let dCount = 0
  let minutes = ATP_ACTIVATION_MIN
  const main: PrescribedExercise[] = []
  for (const item of b.items) {
    let letter: BlockLetter
    let e = item.exercise
    let perSet = item.kind === 'vitesse' ? 1.5 : MINUTES_PER_SET[item.kind]
    if (item.kind === 'vitesse' || item.kind === 'puissance') letter = 'B'
    else if (item.kind === 'principal' && !cDone) {
      letter = 'C'
      cDone = true
      e = strengthExercise(env, 'squat', strength, 'C', undefined, e.exerciseId)
      // Orientation « force » (RC-5.5) : une série de plus, seulement sur un schéma en séries fixes (pas sur une vague).
      const primaryGoal = input.profile.goals?.primary
      const forceGoal =
        primaryGoal === 'force-hypertrophie' || (b.level.fullBody && (primaryGoal === 'puissance' || primaryGoal === 'explosivite'))
      if ((input.context?.orientation?.focus === 'force' || forceGoal) && !e.prescription.waves) {
        e = { ...e, prescription: { ...e.prescription, sets: e.prescription.sets + ORIENT_FORCE_EXTRA_SETS } }
      }
      perSet = MINUTES_PER_SET.principal
    } else if ((item.kind === 'principal' || item.kind === 'secondaire') && dCount < 3) {
      letter = 'D'
      dCount += 1
    } else letter = 'E'
    const rest = e.restSec ?? DEFAULT_REST[letter]
    main.push({ ...e, group: letter, ...(rest ? { restSec: rest } : {}) })
    minutes += e.prescription.sets * perSet
  }
  main.sort((x, y) => LETTER_ORDER[x.group!] - LETTER_ORDER[y.group!])

  const atpWeek = SEASON_ACTIVATION_WEEKS[((input.rotation % 3) + 3) % 3]!
  const kind = atpKindForSlot(input.slot)
  const activationBlock: AtpBlockDef = { letter: 'A', kind: 'echauffement', title: 'Activation', items: [] }
  const activation: PrescribedExercise[] = []
  for (const item of atpActivation(kind, atpWeek)) {
    if (used.has(item.id) || b.excluded.has(item.id) || !getExercise(item.id)) continue
    used.add(item.id)
    activation.push(atpItemExercise(env, { ...item, rpe: null }, activationBlock))
  }

  const finisher: PrescribedExercise[] = []
  if (!beginner && !nearMatch && !input.deload) {
    const week = kind === 'lower' ? ((input.rotation % 9) + 9) % 9 + 1 : 2
    const block = atpBlocks(kind, week).find((bl) => bl.letter === 'F')
    for (const item of block?.items ?? []) {
      if (used.has(item.id) || b.excluded.has(item.id) || !getExercise(item.id)) continue
      used.add(item.id)
      finisher.push(atpItemExercise(env, item, block!))
    }
  }
  return { exercises: [...activation, ...main, ...finisher], minutes }
}

/**
 * Sprints répétés (objectif endurance) : 3 séries de 6 sprints de 20 à 30 m, départ toutes les 20 à 25 s, 3 min entre les
 * séries. Protocole de type RST des essais chez des joueurs de sports collectifs (choix de conception dans ces bornes).
 */
function composeRepeatedSprints(input: ComposeInput): Session {
  const b = new Builder(input)
  const exercises: PrescribedExercise[] = []
  const id = b.pick(['repeated-sprints', 'bike-sprint'], false, 0)
  if (id) {
    const sets = b.factor < 1 ? deloadSets(3, b.factor) : 3
    exercises.push({
      exerciseId: id,
      block: 'conditionnement',
      prescription: { sets, reps: 6, unit: 'reps', targetRpe: b.rpe(input.deload ? 8 : 9) },
      note: '6 sprints de 20 à 30 m, un départ toutes les 20 à 25 s, 3 min entre les séries. Garde la qualité de course.',
      restSec: [180, 180],
    })
  }
  const warmup = warmupFor('complet')
  const reasons: PlanReason[] = [
    ...(input.reasons ?? []),
    reason('objectif-endurance-sprints', 'Objectif endurance : second conditionnement de la semaine en sprints répétés.'),
  ]
  if (input.deload) reasons.push(reason('deload', 'Semaine allégée : volume réduit pour récupérer (une semaine sur cinq).'))
  reasons.push(...contextReasons(input))
  return {
    id: sessionId(input.date, 'conditionnement'),
    date: input.date,
    kind: 'conditionnement',
    slot: 'conditionnement',
    title: 'Sprints répétés',
    focus: 'endurance de vitesse',
    durationMin: CONDITIONING_DURATION_MIN,
    maxRpe: exercises[0]?.prescription.targetRpe ?? null,
    optional: false,
    warmup,
    exercises,
    accents: [],
    deload: input.deload,
    status: 'prevue',
    logId: null,
    reasons,
  }
}

/** RC-6.4 : sous alerte, le conditionnement intense est remplacé par de l'aérobie léger et de la mobilité. */
function composeLightConditioning(input: ComposeInput): Session {
  const b = new Builder(input)
  const aerobic = b.pick(RECOVERY_AEROBIC_POOL, true, 1)
  const exercises: PrescribedExercise[] = []
  if (aerobic) exercises.push(lightItem(aerobic, 'recuperation', 1, LIGHT_CONDITIONING_AEROBIC_MIN, 'min', 3, 'Facile et régulier : tu dois pouvoir parler sans gêne (RPE 3 ou moins).'))
  for (const id of RECOVERY_MOBILITY) {
    if (getExercise(id) && !b.excluded.has(id)) exercises.push(lightItem(id, 'recuperation', 1, 5, 'min', null))
  }
  const warmup = warmupFor('court')
  return {
    id: sessionId(input.date, 'conditionnement'),
    date: input.date,
    kind: 'conditionnement',
    slot: 'conditionnement',
    title: 'Aérobie léger',
    focus: 'conditionnement allégé et mobilité',
    durationMin: roundUp5(warmup.durationMin + LIGHT_CONDITIONING_AEROBIC_MIN + 5 * RECOVERY_MOBILITY.length),
    maxRpe: 3,
    optional: false,
    warmup,
    exercises,
    accents: [],
    deload: input.deload,
    status: 'prevue',
    logId: null,
    reasons: [
      ...(input.reasons ?? []),
      reason('conditionnement-allege', 'Conditionnement intense remplacé par de l’aérobie léger et de la mobilité.'),
      ...contextReasons(input),
    ],
  }
}

function composeConditioning(input: ComposeInput): Session {
  if (input.context?.lightConditioning) return composeLightConditioning(input)
  if (input.repeatedSprints) return composeRepeatedSprints(input)
  const b = new Builder(input)
  const emphasis = getPositionEmphasis(input.profile.position)
  const peak = getMatchPeak(input.profile.position, '1min')
  const ids = emphasis.conditioningExerciseIds.filter((id) => getExercise(id) !== undefined && !b.excluded.has(id))
  const main = ids[0]
  const second = ids[1]
  if (main) {
    const sets = b.factor < 1 ? deloadSets(6, b.factor) : 6
    const calibrated = getExercise(main)?.peakCalibrated === true
    b.items.push({
      kind: 'secondaire',
      exercise: {
        exerciseId: main,
        block: 'conditionnement',
        prescription: { sets, reps: 1, unit: 'min', targetRpe: b.rpe(input.deload ? 7 : 8) },
        note: calibrated
          ? `Vise environ ${peak.mean} m/min sur la minute, le pic d’un joueur de ton poste (à revérifier).`
          : 'Effort intense, récupération active entre les répétitions.',
      },
    })
  }
  if (second) {
    const sets = b.factor < 1 ? deloadSets(4, b.factor) : 4
    b.items.push({
      kind: 'accessoire',
      exercise: {
        exerciseId: second,
        block: 'conditionnement',
        prescription: { sets, reps: 30, unit: 's', targetRpe: b.rpe(input.deload ? 7 : 8) },
      },
    })
  }
  const warmup = warmupFor('complet')
  const reasons: PlanReason[] = [
    ...(input.reasons ?? []),
    reason('conditionnement-semaine-sans-match', 'Semaine sans match : une séance de conditionnement calibrée sur les pics de ton poste.'),
  ]
  if (input.deload) reasons.push(reason('deload', 'Semaine allégée : volume réduit pour récupérer (une semaine sur cinq).'))
  reasons.push(...contextReasons(input))
  const rpes = b.exercises.map((e) => e.prescription.targetRpe).filter((r): r is number => r !== null)
  return {
    id: sessionId(input.date, 'conditionnement'),
    date: input.date,
    kind: 'conditionnement',
    slot: 'conditionnement',
    title: 'Conditionnement',
    focus: 'intermittent calibré sur ton poste',
    durationMin: roundUp5(Math.max(CONDITIONING_DURATION_MIN, warmup.durationMin + b.workMinutes)),
    maxRpe: rpes.length ? Math.max(...rpes) : null,
    optional: false,
    warmup,
    exercises: b.exercises,
    accents: [],
    deload: input.deload,
    status: 'prevue',
    logId: null,
    reasons,
  }
}

function lightItem(id: string, block: BlockKind, sets: number, reps: number, unit: PrescribedSet['unit'], rpe: number | null, note?: string): PrescribedExercise {
  const ex: PrescribedExercise = { exerciseId: id, block, prescription: { sets, reps, unit, targetRpe: rpe } }
  if (note) ex.note = note
  return ex
}

function composeRecovery(input: ComposeInput): Session {
  const b = new Builder(input)
  const aerobic = b.pick(RECOVERY_AEROBIC_POOL, true, 0)
  const exercises: PrescribedExercise[] = []
  if (aerobic) exercises.push(lightItem(aerobic, 'recuperation', 1, 15, 'min', 2, 'Facile : tu dois pouvoir parler sans gêne (RPE 2 ou moins).'))
  for (const id of RECOVERY_MOBILITY) {
    if (getExercise(id) && !b.excluded.has(id)) exercises.push(lightItem(id, 'recuperation', 1, 5, 'min', null))
  }
  // 20 à 59 min jouées : bloc de compensation courte (10-15 min) à la suite de la récupération, si le contexte le prévoit.
  const short = input.context?.compensation?.[input.date] === 'courte'
  if (short) exercises.push(...compensationExercises('courte', input.profile, input.context))
  const warmup = warmupFor('court')
  return {
    id: sessionId(input.date, 'recuperation'),
    date: input.date,
    kind: 'recuperation',
    slot: 'recuperation',
    title: 'Récupération active',
    focus: 'mobilité et aérobie léger',
    durationMin: RECOVERY_DURATION_MIN + (short ? COMPENSATION_SHORT_DURATION_MIN : 0),
    maxRpe: short ? 8 : 2,
    optional: false,
    warmup,
    exercises,
    accents: [],
    deload: false,
    status: 'prevue',
    logId: null,
    reasons: [
      ...(input.reasons ?? []),
      reason('recuperation-md1', 'Lendemain de match : récupération active, aucune charge.'),
      ...contextReasons(input),
    ],
  }
}

function composeActivation(input: ComposeInput): Session {
  const b = new Builder(input)
  const level = b.level
  const exercises: PrescribedExercise[] = []
  const add = (id: string, sets: number, reps: number, unit: PrescribedSet['unit'], rpe: number, block: BlockKind, note?: string) => {
    if (getExercise(id) && !b.excluded.has(id)) exercises.push(lightItem(id, block, sets, reps, unit, capRpe(level, rpe), note))
  }
  add('countermovement-jump', 2, 3, 'reps', 5, 'puissance', 'Sauts légers et propres, pas de fatigue.')
  add('running-drills', 3, 1, 'reps', 6, 'vitesse', 'Accélérations courtes (10 à 15 m), sans aller au maximum.')
  add('hip-mobility', 1, 3, 'min', 3, 'recuperation')
  const warmup = warmupFor('court')
  return {
    id: sessionId(input.date, 'activation'),
    date: input.date,
    kind: 'activation',
    slot: 'activation',
    title: 'Activation légère',
    focus: 'veille de match, facultative',
    durationMin: ACTIVATION_DURATION_MIN,
    maxRpe: 6,
    optional: true,
    warmup,
    exercises,
    accents: [],
    deload: false,
    status: 'prevue',
    logId: null,
    reasons: [
      ...(input.reasons ?? []),
      reason('activation-md1', 'Veille de match : activation légère et facultative, faible volume, rien d’intense.'),
      ...contextReasons(input),
    ],
  }
}

/**
 * Compose une séance (échauffement Activate en tête, puis exercices prescrits en séries × reps @ RPE).
 * Fonction pure : mêmes entrées, même séance.
 */
export function composeSession(input: ComposeInput): Session {
  switch (input.slot) {
    case 'conditionnement':
      return composeConditioning(input)
    case 'recuperation':
      return composeRecovery(input)
    case 'activation':
      return composeActivation(input)
    case 'compensation':
      return composeCompensation({
        date: input.date,
        profile: input.profile,
        context: input.context,
        ...(input.reasons ? { reasons: input.reasons } : {}),
      })
    default:
      return composeMuscu(input)
  }
}

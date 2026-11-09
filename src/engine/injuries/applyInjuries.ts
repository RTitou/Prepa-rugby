import { TIMED_EXERCISES } from '../config'
import { EXERCISES, getExercise } from '../../reference/exercises/library'
import { getSubstitutionRule, isExcludedByZones, isExerciseExcluded } from '../../reference/substitutions/table'
import type { Injury } from '../../types/injury'
import type { LiftingExperience } from '../../types/profile'
import type { PlanReason, PrescribedExercise, PrescribedSet, Session } from '../../types/plan'
import type { BodyZone, Exercise } from '../../types/reference'
import type { PlanContext } from '../context'
import { RECOVERY_AEROBIC_POOL, RECOVERY_MOBILITY } from '../week-builder/templates'
import { evaluateSuspension } from './suspension'

/** Au plus ce nombre de blocs de mobilité ou de récupération de repli par séance : au-delà, le bloc est retiré. */
const MAX_FALLBACKS_PER_SESSION = 3

/** Zones des blessures actives, sans doublon, triées (ordre stable pour l'empreinte de la semaine). */
export function activeInjuryZones(injuries: readonly Pick<Injury, 'zone' | 'status' | 'deletedAt'>[]): BodyZone[] {
  return [...new Set(injuries.filter((i) => i.status === 'active' && i.deletedAt === null).map((i) => i.zone))].sort()
}

/**
 * Contexte de plan issu des blessures (RC-8.4) : zones actives cumulables, suspension (commotion, signe grave), raison
 * affichée sur chaque séance. Les blessures guéries ou supprimées n'ont aucun effet : le plan normal revient.
 */
export function injuryContext(injuries: readonly Injury[]): PlanContext {
  const active = injuries.filter((i) => i.status === 'active' && i.deletedAt === null)
  if (active.length === 0) return {}
  const zones = activeInjuryZones(active)
  const context: PlanContext = { injuryZones: zones }
  if (evaluateSuspension(active).suspended) context.suspended = true
  context.reasons = zones.map((z): PlanReason => ({
    code: `blessure-${z}`,
    text: `Blessure active (${getSubstitutionRule(z).label}) : exercices adaptés, voir l’accueil.`,
    source: 'blessure',
  }))
  return context
}

/** Pool de repli quand aucun substitut n'existe : mobilité d'abord, puis récupération et aérobie léger (ordre fixe). */
function fallbackPool(): Exercise[] {
  const ordered = [
    ...RECOVERY_MOBILITY,
    ...EXERCISES.filter((e) => e.category === 'mobilite-recuperation').map((e) => e.id),
    ...RECOVERY_AEROBIC_POOL,
    ...EXERCISES.filter((e) => e.category === 'aerobie-leger').map((e) => e.id),
  ]
  const seen = new Set<string>()
  const out: Exercise[] = []
  for (const id of ordered) {
    const ex = getExercise(id)
    if (ex && !seen.has(id)) {
      seen.add(id)
      out.push(ex)
    }
  }
  return out
}

/** Prescription du substitut : séries et RPE de l'exercice remplacé, durée tenue si le substitut est chronométré. */
function substitutePrescription(original: PrescribedSet, id: string, experience: LiftingExperience): PrescribedSet {
  const timed = TIMED_EXERCISES[id]
  if (timed) return { sets: original.sets, reps: timed[experience], unit: 's', targetRpe: original.targetRpe }
  if (original.unit !== 'reps') return { sets: original.sets, reps: 10, unit: 'reps', targetRpe: original.targetRpe }
  const out: PrescribedSet = { sets: original.sets, reps: original.reps, unit: 'reps', targetRpe: original.targetRpe }
  if (original.repsMax !== undefined) out.repsMax = original.repsMax
  return out
}

/** Méthode ATP : le remplaçant garde la lettre de bloc, le caractère facultatif et la récupération de l'exercice remplacé. */
function blockMeta(e: PrescribedExercise): Pick<PrescribedExercise, 'group' | 'optional' | 'restSec'> {
  return {
    ...(e.group ? { group: e.group } : {}),
    ...(e.optional ? { optional: true } : {}),
    ...(e.restSec ? { restSec: e.restSec } : {}),
  }
}

function zoneName(zone: BodyZone): string {
  return getSubstitutionRule(zone).label
}

/**
 * Applique les blessures actives à une séance (RC-8.4). Fonction pure et déterministe.
 *
 * Pour chaque exercice qui touche une zone active (zone sollicitée, charge axiale, impact ou exercice nommé par la règle) :
 * 1. substitut de la même catégorie, listé par la règle de la zone concernée et autorisé pour TOUTES les zones actives
 *    (premier de la liste de la table, jamais un exercice déjà présent dans la séance) ;
 * 2. à défaut, exercice de mobilité ou de récupération autorisé ;
 * 3. à défaut, le bloc est retiré.
 * Chaque remplacement renseigne `replaces` ; chaque retrait ajoute une raison à la séance.
 */
export function applyInjuries(session: Session, zones: readonly BodyZone[], experience: LiftingExperience): Session {
  if (zones.length === 0) return session
  const blocked = (ex: Exercise) => isExcludedByZones(zones, ex)
  const flagged = session.exercises.map((e) => {
    const def = getExercise(e.exerciseId)
    return { e, def, hit: def !== undefined && blocked(def) }
  })
  if (!flagged.some((f) => f.hit)) return session

  const used = new Set(flagged.filter((f) => !f.hit).map((f) => f.e.exerciseId))
  const fallback = fallbackPool()
  const out: PrescribedExercise[] = []
  const removed: PlanReason[] = []
  let replacedCount = 0
  let fallbacks = 0

  for (const f of flagged) {
    if (!f.hit || !f.def) {
      out.push(f.e)
      continue
    }
    const def = f.def
    // Zones qui excluent cet exercice : leur zone nomme le « remplace … (zone) » et fournit les substituts.
    const offending = zones.filter((z) => isExerciseExcluded(getSubstitutionRule(z), def))
    const candidateIds = [...new Set(offending.flatMap((z) => getSubstitutionRule(z).substituteIds))]
    const same = candidateIds
      .map((id) => getExercise(id))
      .find((c): c is Exercise => c !== undefined && c.category === def.category && !used.has(c.id) && !blocked(c))
    const zone = offending[0]!
    if (same) {
      used.add(same.id)
      out.push({
        exerciseId: same.id,
        block: f.e.block,
        prescription: substitutePrescription(f.e.prescription, same.id, experience),
        replaces: { exerciseId: def.id, zone },
        ...blockMeta(f.e),
      })
      replacedCount += 1
      continue
    }
    const rest = fallbacks < MAX_FALLBACKS_PER_SESSION ? fallback.find((c) => !used.has(c.id) && !blocked(c)) : undefined
    if (rest) {
      used.add(rest.id)
      fallbacks += 1
      out.push({
        exerciseId: rest.id,
        block: 'recuperation',
        prescription: { sets: 1, reps: 5, unit: 'min', targetRpe: null },
        replaces: { exerciseId: def.id, zone },
        ...blockMeta(f.e),
      })
      replacedCount += 1
      continue
    }
    removed.push({
      code: `blessure-retire-${def.id}`,
      text: `${def.name} retiré (${zoneName(zone)}) : aucun substitut possible.`,
      source: 'blessure',
    })
  }

  const rpes = out.map((e) => e.prescription.targetRpe).filter((r): r is number => r !== null)
  const maxRpe = rpes.length ? Math.max(...rpes) : null
  const label = zones.map(zoneName).join(', ')
  const summary: PlanReason = {
    code: 'blessure-adaptation',
    text: `Séance adaptée à ta blessure (${label}) : ${replacedCount} exercice${replacedCount > 1 ? 's' : ''} remplacé${replacedCount > 1 ? 's' : ''}${removed.length ? `, ${removed.length} retiré${removed.length > 1 ? 's' : ''}` : ''}.`,
    source: 'blessure',
  }
  return {
    ...session,
    exercises: out,
    maxRpe: session.maxRpe !== null && maxRpe !== null ? Math.min(session.maxRpe, maxRpe) : maxRpe,
    reasons: [...session.reasons, summary, ...removed],
  }
}

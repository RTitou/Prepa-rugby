import { PAIN_EXCLUDE_IMPACT_AT_LEAST } from '../config'
import { getWarmup } from '../../reference/activate/warmup'
import { getExercise } from '../../reference/exercises/library'
import { getSubstitutionRule, isExcludedByZones, isExerciseExcluded } from '../../reference/substitutions/table'
import type { PlanReason, Session } from '../../types/plan'
import { IMPACT_ORDER, type BodyZone, type Exercise, type WarmupStep } from '../../types/reference'

/**
 * Vrai si l'exercice ne doit pas figurer dans l'échauffement : mêmes règles que la séance (applyInjuries) pour les zones
 * des blessures actives, et exclusion des impacts forts pour les zones en vigilance (`painZones`, RC-8.5).
 */
export function isWarmupExerciseBlocked(ex: Exercise, injuryZones: readonly BodyZone[], painZones: readonly BodyZone[]): boolean {
  if (isExcludedByZones(injuryZones, ex)) return true
  return painZones.length > 0 && IMPACT_ORDER[ex.impact] >= IMPACT_ORDER[PAIN_EXCLUDE_IMPACT_AT_LEAST] && ex.zones.some((z) => painZones.includes(z))
}

/**
 * Adapte les étapes d'un échauffement : exercice exclu remplacé par un substitut autorisé de la même catégorie listé par la
 * règle de la zone (jamais déjà présent dans l'échauffement), sinon retiré ; une étape sans exercice disparaît.
 * Retourne aussi les zones qui ont provoqué un changement (pour la mention affichée).
 */
export function adaptWarmupSteps(
  steps: readonly WarmupStep[],
  injuryZones: readonly BodyZone[],
  painZones: readonly BodyZone[] = [],
): { steps: WarmupStep[]; changedZones: BodyZone[] } {
  const blocked = (ex: Exercise) => isWarmupExerciseBlocked(ex, injuryZones, painZones)
  const used = new Set(steps.flatMap((s) => s.exerciseIds).filter((id) => {
    const ex = getExercise(id)
    return ex !== undefined && !blocked(ex)
  }))
  const changed = new Set<BodyZone>()
  const out: WarmupStep[] = []
  for (const step of steps) {
    const ids: string[] = []
    const dropped: string[] = []
    for (const id of step.exerciseIds) {
      const ex = getExercise(id)
      if (!ex || !blocked(ex)) {
        ids.push(id)
        continue
      }
      const offending = injuryZones.filter((z) => isExerciseExcluded(getSubstitutionRule(z), ex))
      const zones = offending.length > 0 ? offending : painZones.filter((z) => ex.zones.includes(z))
      for (const z of zones) changed.add(z)
      const candidates = [...new Set(offending.flatMap((z) => getSubstitutionRule(z).substituteIds))]
      const sub = candidates
        .map((c) => getExercise(c))
        .find((c): c is Exercise => c !== undefined && c.category === ex.category && !used.has(c.id) && !blocked(c))
      if (sub) {
        used.add(sub.id)
        ids.push(sub.id)
      }
      dropped.push(ex.name)
    }
    if (ids.length === 0) continue
    out.push(
      dropped.length === 0
        ? { ...step, exerciseIds: ids }
        : { ...step, exerciseIds: ids, instructions: `${step.instructions} Adapté à ta blessure : sans ${dropped.join(', ')}.` },
    )
  }
  return { steps: out, changedZones: [...changed].sort() }
}

/**
 * Applique les blessures à l'échauffement d'une séance. Sans zone, ou si rien n'est touché, la séance est renvoyée telle quelle.
 * Sinon `warmup.steps` contient l'échauffement adapté, la durée est recalculée et la raison « échauffement adapté (zone) » est ajoutée.
 */
export function applyInjuriesToWarmup(session: Session, injuryZones: readonly BodyZone[], painZones: readonly BodyZone[] = []): Session {
  if (injuryZones.length === 0 && painZones.length === 0) return session
  const base = getWarmup(session.warmup.version)
  const { steps, changedZones } = adaptWarmupSteps(base.steps, injuryZones, painZones)
  if (changedZones.length === 0) return session
  const label = changedZones.map((z) => getSubstitutionRule(z).label).join(', ')
  const reason: PlanReason = { code: 'blessure-echauffement', text: `Échauffement adapté (${label}).`, source: 'blessure' }
  return {
    ...session,
    warmup: {
      ...session.warmup,
      steps,
      adaptedZones: changedZones,
      durationMin: steps.reduce((sum, s) => sum + s.durationMin, 0),
    },
    reasons: [...session.reasons, reason],
  }
}

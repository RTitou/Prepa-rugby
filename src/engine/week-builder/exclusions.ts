import { EXERCISES } from '../../reference/exercises/library'
import { IMPACT_ORDER } from '../../types/reference'
import { PAIN_EXCLUDE_IMPACT_AT_LEAST } from '../config'
import type { PlanContext } from '../context'

/**
 * Exercices à ne pas prescrire d'après le contexte : ceux listés (`excludedExerciseIds`) et, pour chaque zone en vigilance
 * (`painZones`, RC-8.5), ceux qui la sollicitent avec un impact au moins égal à `PAIN_EXCLUDE_IMPACT_AT_LEAST`.
 */
export function excludedExerciseSet(context: PlanContext | undefined): ReadonlySet<string> {
  const out = new Set<string>(context?.excludedExerciseIds ?? [])
  const zones = context?.painZones
  if (zones && zones.length > 0) {
    const min = IMPACT_ORDER[PAIN_EXCLUDE_IMPACT_AT_LEAST]
    for (const ex of EXERCISES) {
      if (IMPACT_ORDER[ex.impact] >= min && ex.zones.some((z) => zones.includes(z))) out.add(ex.id)
    }
  }
  return out
}

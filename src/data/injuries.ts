import { injuryContext } from '../engine/injuries/applyInjuries'
import type { PlanContext } from '../engine/context'
import { listInjuries } from './repositories/injuryRepo'
import { registerPlanContextProvider } from './repositories/planRepo'

/** Contexte issu des blessures actives : zones à épargner et suspension éventuelle. */
export async function loadInjuryContext(): Promise<PlanContext> {
  return injuryContext(await listInjuries())
}

let unregister: (() => void) | null = null

/**
 * Branche les blessures sur la génération du plan (une seule fois) : déclarer ou guérir une blessure change le contexte,
 * donc l'empreinte de la semaine, et fait régénérer les jours restants (aujourd'hui compris tant que la séance n'est pas commencée).
 */
export function registerInjuries(): () => void {
  if (unregister === null) {
    const remove = registerPlanContextProvider(async () => loadInjuryContext())
    unregister = () => {
      remove()
      unregister = null
    }
  }
  return unregister
}

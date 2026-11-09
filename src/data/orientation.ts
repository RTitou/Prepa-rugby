import type { PlanContext } from '../engine/context'
import { analyzeRecords } from '../engine/weaknesses/analyze'
import { todayLocal } from './ids'
import { registerPlanContextProvider } from './repositories/planRepo'
import { getProfile } from './repositories/profileRepo'
import { listRecords } from './repositories/recordsRepo'

/** Contexte issu des records : l'orientation (point faible détecté) des séances à venir. */
export async function loadRecordsContext(today: string = todayLocal()): Promise<PlanContext> {
  const profile = await getProfile()
  if (!profile) return {}
  const analysis = analyzeRecords(profile, await listRecords(), today)
  return analysis.orientation ? { orientation: analysis.orientation } : {}
}

let unregister: (() => void) | null = null

/**
 * Branche les records sur la génération du plan (une seule fois) : un nouveau record qui change l'orientation change le contexte,
 * donc l'empreinte de la semaine, et fait régénérer les jours restants.
 */
export function registerRecordsOrientation(): () => void {
  if (unregister === null) {
    const remove = registerPlanContextProvider(async () => loadRecordsContext())
    unregister = () => {
      remove()
      unregister = null
    }
  }
  return unregister
}

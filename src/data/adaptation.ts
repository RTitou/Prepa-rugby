import { adaptPlan, type Adaptation } from '../engine/load/adjust'
import { loadsFromLogs, loadsFromRatings } from '../engine/load/sessionLoad'
import type { PlanContext } from '../engine/context'
import { listMatches } from './repositories/calendarRepo'
import { registerPlanContextProvider } from './repositories/planRepo'
import { listAllSessionLogs } from './repositories/sessionLogRepo'
import { listAllMorningWellness, listAllSessionRatings } from './repositories/wellnessRepo'
import { todayLocal } from './ids'

/**
 * Lit les saisies (ressenti, notes, minutes, journaux de séance, matchs) et applique les règles d'adaptation.
 * L'horloge n'est lue qu'ici : le moteur reçoit la date du jour en argument.
 */
export async function loadAdaptation(weekStart: string, today: string = todayLocal()): Promise<Adaptation> {
  const [mornings, ratings, logs, matches] = await Promise.all([
    listAllMorningWellness(),
    listAllSessionRatings(),
    listAllSessionLogs(),
    listMatches(),
  ])
  return adaptPlan({
    weekStart,
    today,
    mornings: mornings.map((m) => ({ date: m.date, scores: m.scores, painZone: m.painZone })),
    matchRatings: ratings
      .filter((r) => r.kind === 'match')
      .map((r) => ({ date: r.date, minutesPlayed: r.minutesPlayed, contactIntensity: r.contactIntensity })),
    loads: [...loadsFromLogs(logs), ...loadsFromRatings(ratings)],
    matches: matches.map((m) => ({ date: m.date, time: m.time })),
  })
}

let unregister: (() => void) | null = null

/**
 * Branche l'adaptation sur la génération du plan (une seule fois) : tout changement de ressenti, de charge ou de minutes
 * jouées change le contexte, donc l'empreinte de la semaine, et fait régénérer les jours restants.
 */
export function registerAdaptation(): () => void {
  if (unregister === null) {
    const remove = registerPlanContextProvider(async (weekStart): Promise<PlanContext> => (await loadAdaptation(weekStart)).context)
    unregister = () => {
      remove()
      unregister = null
    }
  }
  return unregister
}

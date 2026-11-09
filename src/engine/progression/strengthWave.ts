import type { SeasonWaveWeek } from '../../reference/atp/strength'
import { DELOAD_EVERY_WEEKS } from '../config'

/**
 * Semaine de la vague de force en saison d'après le rang dans le cycle de charge (voir progression/deload.ts) :
 * semaines 1 à 4 de la vague, puis la 5ᵉ semaine du cycle, qui est la décharge. Une décharge imposée par le contexte
 * (ressenti dégradé) l'emporte.
 */
export function seasonWaveWeek(cycleIndex: number, deload: boolean): SeasonWaveWeek {
  if (deload) return 'decharge'
  const i = ((cycleIndex % DELOAD_EVERY_WEEKS) + DELOAD_EVERY_WEEKS) % DELOAD_EVERY_WEEKS
  return i === DELOAD_EVERY_WEEKS - 1 ? 'decharge' : ((i + 1) as 1 | 2 | 3 | 4)
}

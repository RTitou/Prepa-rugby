import { addDays, diffWeeks } from '../dates'
import { DELOAD_EVERY_WEEKS, DELOAD_RPE_DROP, DELOAD_VOLUME_FACTOR } from '../config'

/**
 * Rang de la semaine dans le cycle : 0 pour la première semaine après la dernière décharge
 * (ou depuis le début du suivi). Négatif si la semaine précède le début du suivi.
 */
export function cycleWeekIndex(weekStart: string, anchorMonday: string): number {
  return diffWeeks(anchorMonday, weekStart)
}

/** RC-5.3 : la Nᵉ semaine du cycle est allégée (4 semaines normales puis 1 allégée par défaut). */
export function isScheduledDeload(cycleIndex: number): boolean {
  return cycleIndex >= 0 && (cycleIndex + 1) % DELOAD_EVERY_WEEKS === 0
}

/**
 * Début du cycle courant : le lendemain de la dernière semaine allégée stockée avant `weekStart`,
 * sinon le début du suivi (première semaine générée).
 */
export function cycleAnchor(weekStart: string, storedDeloadWeeks: readonly string[], trackingStart: string): string {
  const previous = storedDeloadWeeks.filter((w) => w < weekStart).sort()
  const lastDeload = previous[previous.length - 1]
  if (lastDeload === undefined) return trackingStart
  const monday = addDays(lastDeload, 7)
  return monday > weekStart ? weekStart : monday
}

/** Séries d'un exercice en semaine allégée (jamais moins d'une série). */
export function deloadSets(sets: number, factor: number = DELOAD_VOLUME_FACTOR): number {
  return Math.max(1, Math.round(sets * factor))
}

export function deloadRpe(rpe: number): number {
  return Math.max(5, rpe - DELOAD_RPE_DROP)
}

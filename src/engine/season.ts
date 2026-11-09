import type { TrainingPhase } from '../types/profile'
import { addDays, diffWeeks, mondayOf } from './dates'
import { OFFSEASON_WEEKS } from './config'

/**
 * Semaine du programme d'intersaison ATP (1 à 9) pour la semaine du lundi `weekStart`.
 * null en saison, avant le lundi de départ, ou après la semaine 9 (retour automatique en saison).
 */
export function programWeek(phase: TrainingPhase | undefined, weekStart: string): number | null {
  if (!phase || phase.kind !== 'intersaison') return null
  const n = diffWeeks(mondayOf(phase.startMonday), weekStart) + 1
  return n >= 1 && n <= OFFSEASON_WEEKS ? n : null
}

/** Dimanche qui termine la semaine 9 de l'intersaison. */
export function offseasonEnd(startMonday: string): string {
  return addDays(mondayOf(startMonday), OFFSEASON_WEEKS * 7 - 1)
}

/** Lundi de départ proposé par défaut : le lundi courant si on est lundi, sinon le lundi suivant. */
export function defaultStartMonday(today: string): string {
  const monday = mondayOf(today)
  return monday === today ? today : addDays(monday, 7)
}

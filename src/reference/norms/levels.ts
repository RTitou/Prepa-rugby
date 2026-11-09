import { PLAY_LEVELS, type PlayLevel } from '../../types/profile'

/** Niveaux de jeu, du plus bas au plus haut (ordre de PLAY_LEVELS). */
export const LEVEL_ORDER: readonly PlayLevel[] = PLAY_LEVELS.map((l) => l.value)

/** Niveau immédiatement au-dessus ; le niveau le plus haut renvoie le même niveau. */
export function levelAbove(level: PlayLevel): PlayLevel {
  const index = LEVEL_ORDER.indexOf(level)
  if (index < 0) throw new Error(`Niveau inconnu : ${level}`)
  return LEVEL_ORDER[Math.min(index + 1, LEVEL_ORDER.length - 1)] as PlayLevel
}

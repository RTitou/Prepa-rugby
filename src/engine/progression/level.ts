import type { LiftingExperience, PlayLevel } from '../../types/profile'
import { levelAbove } from '../../reference/norms/levels'
import { LEVELS, LEVEL_UP_MIN_TESTS, type LevelConfig } from '../config'
import type { AvailableComparison, Comparison } from '../weaknesses/compare'

export interface StartingLevel extends LevelConfig {
  experience: LiftingExperience
}

/** RC-5.1 : niveau de départ d'après l'ancienneté en musculation. */
export function startingLevel(experience: LiftingExperience): StartingLevel {
  return { experience, ...LEVELS[experience] }
}

/** Plafonne un RPE cible au maximum du niveau (RC-5.1 : débutant ≤ 8). */
export function capRpe(level: LevelConfig, rpe: number): number {
  return Math.min(rpe, level.rpeCap)
}

/**
 * Niveau suivant à proposer quand les records franchissent les repères du niveau au-dessus (réévaluation, jamais appliquée seule).
 *
 * Choix de conception : le niveau de jeu déclaré (profil.level) ne change jamais sans l'accord du joueur. Les records n'en
 * déduisent qu'une PROPOSITION ; un bouton de l'écran Records enregistre alors le nouveau niveau. Il n'existe pas de « niveau
 * d'entraînement » séparé : le niveau d'entraînement (ancienneté en musculation) reste celui du profil, et l'orientation des séances
 * suit les points faibles (voir weaknesses/orient.ts), pas le niveau de jeu.
 *
 * Règle : au moins LEVEL_UP_MIN_TESTS tests au moins égaux à la moyenne du niveau directement au-dessus, et aucun en dessous.
 * Pas de proposition quand le niveau au-dessus est atteint par repli (loisir) ou que le joueur est déjà au sommet.
 */
export function proposeLevelUp(level: PlayLevel, comparisons: readonly Comparison[]): PlayLevel | null {
  const next = levelAbove(level)
  if (next === level) return null
  const usable = comparisons.filter((c): c is AvailableComparison => c.available && c.targetLevel === next && !c.fallbackLevel)
  if (usable.some((c) => c.status === 'en-dessous')) return null
  const reached = usable.filter((c) => c.deltaPct >= 0)
  return reached.length >= LEVEL_UP_MIN_TESTS ? next : null
}

import type { LiftingExperience } from '../types/profile'
import type { PrescribedSet, SessionSlot } from '../types/plan'

/*
 * Prévention des blessures musculaires ajoutée au programme (voir aidd_docs/tasks/2026_11/2026_11_09_objectifs-joueur/veille-objectifs.md) :
 * - ischios : Nordic, programmes qui l'incluent associés à un risque de blessure des ischios divisé par environ 2
 *   (van Dyk et al., BJSM 2019, RR 0,49 ; effet propre au Nordic jugé non concluant par une réévaluation : preuve débattue) ;
 * - adducteurs : planche Copenhague, 41 % de problèmes d'aine en moins (Harøy et al., BJSM 2019, essai randomisé en grappes),
 *   3 fois par semaine en présaison, 1 fois par semaine en saison.
 * Faible volume : le but est l'exposition régulière, pas la fatigue.
 */

export interface PreventionItem {
  exerciseId: string
  prescription: PrescribedSet
  note: string
}

/** Nordic : assisté avant 24 mois de musculation, complet ensuite. */
export function nordicItem(experience: LiftingExperience, sets = 2): PreventionItem {
  const assisted = experience !== 'plus-24-mois'
  return {
    exerciseId: assisted ? 'nordic-assisted' : 'nordic-curl',
    prescription: { sets, reps: 5, unit: 'reps', targetRpe: 7 },
    note: 'Prévention des ischios : descente la plus lente possible, sans aller à l’échec.',
  }
}

/** Planche Copenhague : tenue de 20 à 30 s par côté selon le niveau. */
export function copenhagenItem(experience: LiftingExperience, sets = 2): PreventionItem {
  const sec = experience === 'moins-6-mois' ? 15 : experience === '6-24-mois' ? 20 : 30
  return {
    exerciseId: 'copenhagen',
    prescription: { sets, reps: sec, unit: 's', targetRpe: 6, perSide: true },
    note: 'Prévention de l’aine : genou sur le banc pour débuter, puis pied sur le banc.',
  }
}

/**
 * En saison : un Nordic et une Copenhague par semaine, dans des séances différentes.
 * Nordic : séance bas du corps (ou première séance corps entier). Copenhague : séance haut du corps (ou deuxième corps entier,
 * ou séance puissance).
 */
export function seasonPrevention(slot: SessionSlot, index: number, experience: LiftingExperience): PreventionItem[] {
  // Débutant : toutes ses séances sont en corps entier, on répartit sur la 1re et la 2e. Sinon la séance corps entier
  // complète un bas du corps et un haut du corps qui portent déjà la prévention.
  const fullBodyOnly = experience === 'moins-6-mois'
  if (slot === 'bas-force' || (fullBodyOnly && slot === 'corps-entier' && index === 0)) return [nordicItem(experience)]
  if (slot === 'haut' || (fullBodyOnly && slot === 'corps-entier' && index === 1)) return [copenhagenItem(experience)]
  return []
}

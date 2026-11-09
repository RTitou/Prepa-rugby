import { SEVERE_SIGNS_MESSAGE, getSubstitutionRule } from '../../reference/substitutions/table'
import type { BodyZone } from '../../types/reference'

/** Rappel affiché avec toute suspension et sur l'écran des blessures. */
export const MEDICAL_DISCLAIMER = 'Cette appli ne remplace pas un avis médical.'

/** Mention discrète : la table de substitution n'a pas été relue par un kiné (reviewedByPhysio = false). */
export const PHYSIO_REVIEW_NOTICE = 'Table de substitution à faire relire par un kiné.'

export type SuspensionCause = 'commotion' | 'signe-grave'

/** Ce que le moteur et l'écran ont besoin de savoir d'une blessure pour décider d'une suspension. */
export interface InjuryLite {
  zone: BodyZone
  severeSigns: readonly string[]
}

export interface Suspension {
  suspended: boolean
  causes: SuspensionCause[]
  /** Messages de renvoi médical (un par cause), dans l'ordre des causes. */
  messages: string[]
  /** Délai minimal avant de rejouer (World Rugby), en jours, quand une commotion est en cause. */
  minDaysBeforePlaying: number | null
}

/**
 * Suspension totale du plan : commotion (zone tête, suspectée ou confirmée) ou au moins un signe grave coché sur
 * une blessure active. Levée uniquement quand ces blessures sont déclarées guéries (elles ne sont alors plus passées ici).
 */
export function evaluateSuspension(active: readonly InjuryLite[]): Suspension {
  const causes: SuspensionCause[] = []
  const messages: string[] = []
  let minDays: number | null = null
  const concussion = active.find((i) => getSubstitutionRule(i.zone).suspend)
  if (concussion) {
    const rule = getSubstitutionRule(concussion.zone)
    causes.push('commotion')
    messages.push(rule.message)
    minDays = rule.returnToPlay?.minDaysBeforePlaying ?? null
  }
  if (active.some((i) => i.severeSigns.length > 0)) {
    causes.push('signe-grave')
    messages.push(SEVERE_SIGNS_MESSAGE)
  }
  return { suspended: causes.length > 0, causes, messages, minDaysBeforePlaying: minDays }
}

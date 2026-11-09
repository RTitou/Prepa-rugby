import type { PlanReason } from '../types/plan'
import type { BodyZone } from '../types/reference'

/** Compensation à prévoir à une date : séance complète (peu ou pas joué) ou bloc court ajouté à la récupération (20 à 59 min). */
export type CompensationKind = 'complete' | 'courte'

/** Orientation des séances décidée par les records (RC-5.5) : un seul accent principal à la fois. */
export type OrientationFocus = 'vitesse' | 'force' | 'puissance-vitesse' | 'hypertrophie'

/** Ordre de priorité quand plusieurs orientations sont fusionnées (la première l'emporte). Voir weaknesses/orient.ts. */
export const ORIENTATION_PRIORITY: readonly OrientationFocus[] = ['vitesse', 'force', 'puissance-vitesse', 'hypertrophie']

export interface Orientation {
  focus: OrientationFocus
  /** Point faible nommé (« force relative », « vitesse », « masse »). */
  weakness: string
  /** Phrase affichée dans la séance et sur l'écran Records. */
  reason: string
}

/**
 * Point d'extension du moteur : tout ce que les phases suivantes veulent faire peser sur la génération
 * passe par cet objet, sans que le moteur lise Dexie.
 *
 * - Phase 5 (ressenti, charge, minutes jouées) : `volumeFactor`, `maxTargetRpe`, `lightConditioning`, `maxMuscuSessions`,
 *   `extraMuscuSession`, `blockHeavyLegsUntil`, `compensation`, `recoveryMode`, `painZones`, `reasons`, `dayReasons`.
 * - Phase 6 (records, faiblesses) : `orientation`, lue dans composeSession.
 * - Phase 7 (blessures) : `injuryZones` (zones des blessures actives : exclusion et substitution par la table RC-8.4, voir
 *   engine/injuries/applyInjuries.ts), `suspended`, `reasons`. `painZones` reste la vigilance légère (douleur répétée, RC-8.5, impacts forts
 *   seulement, appliquée à la composition) ; une zone blessée déclarée relève de `injuryZones`, plus stricte et qui signale chaque remplacement.
 *
 * Tous les champs sont facultatifs et sérialisables : le contexte entre dans l'empreinte de la semaine,
 * donc un changement de contexte fait régénérer les jours restants.
 */
export interface PlanContext {
  /** Multiplicateur du volume (séries), entre 0 et 1. Combiné au volume de la semaine allégée. */
  volumeFactor?: number
  /** Impose une semaine allégée (ex. dégradation du ressenti, RC-5.3). */
  forceDeload?: boolean
  /** Plafond du RPE cible de toutes les séances (RC-6.4 : pas de série à RPE ≥ 9 sous alerte). */
  maxTargetRpe?: number
  /** Remplace le conditionnement intense par de l'aérobie léger et de la mobilité (RC-6.4). */
  lightConditioning?: boolean
  /** Autorise une 3e séance en semaine avec match (RC-4.2 : le joueur n'a pas joué). */
  extraMuscuSession?: boolean
  /** Plafond du nombre de séances de musculation de la semaine. */
  maxMuscuSessions?: number
  /** Exercices à ne pas prescrire (blessures actives). */
  excludedExerciseIds?: string[]
  /**
   * Zones en vigilance (douleur deux jours de suite, RC-8.5) : les exercices à fort impact sur ces zones ne sont pas prescrits
   * (voir `PAIN_EXCLUDE_IMPACT_AT_LEAST`). La phase 7 y ajoute les zones des blessures déclarées.
   */
  painZones?: BodyZone[]
  /** Zones des blessures déclarées actives (phase 7) : tout exercice qui les sollicite est remplacé ou retiré, voir applyInjuries. */
  injuryZones?: BodyZone[]
  /** Dernier jour (inclus, AAAA-MM-JJ) où aucune force lourde du bas du corps ni puissance n'est placée (RC 7.3, ≥ 60 min jouées). */
  blockHeavyLegsUntil?: string
  /** Semaine en mode récupération (RC-7.2) : pas de musculation, uniquement récupération et activation. */
  recoveryMode?: boolean
  /** Compensation à prévoir, par date (AAAA-MM-JJ). */
  compensation?: Record<string, CompensationKind>
  /** Orientation issue des records (phase 6) : accent force, puissance-vitesse, vitesse ou hypertrophie. */
  orientation?: Orientation
  /** Plan suspendu : aucune séance générée (commotion, signe grave). */
  suspended?: boolean
  /** Raisons ajoutées à chaque séance générée de la semaine. */
  reasons?: PlanReason[]
  /** Raisons propres à un jour (AAAA-MM-JJ) : ajoutées au jour et à sa séance. */
  dayReasons?: Record<string, PlanReason[]>
}

/** Fusionne plusieurs contextes (un par phase) en un seul, de la façon la plus prudente. */
export function mergeContexts(contexts: readonly PlanContext[]): PlanContext {
  const out: PlanContext = {}
  for (const c of contexts) {
    if (c.volumeFactor !== undefined) out.volumeFactor = Math.min(out.volumeFactor ?? 1, c.volumeFactor)
    if (c.forceDeload) out.forceDeload = true
    if (c.maxTargetRpe !== undefined) out.maxTargetRpe = Math.min(out.maxTargetRpe ?? Infinity, c.maxTargetRpe)
    if (c.lightConditioning) out.lightConditioning = true
    if (c.extraMuscuSession) out.extraMuscuSession = true
    if (c.maxMuscuSessions !== undefined) out.maxMuscuSessions = Math.min(out.maxMuscuSessions ?? Infinity, c.maxMuscuSessions)
    if (c.excludedExerciseIds?.length) {
      out.excludedExerciseIds = [...new Set([...(out.excludedExerciseIds ?? []), ...c.excludedExerciseIds])].sort()
    }
    if (c.painZones?.length) out.painZones = [...new Set([...(out.painZones ?? []), ...c.painZones])].sort()
    if (c.injuryZones?.length) out.injuryZones = [...new Set([...(out.injuryZones ?? []), ...c.injuryZones])].sort()
    if (c.blockHeavyLegsUntil !== undefined && c.blockHeavyLegsUntil > (out.blockHeavyLegsUntil ?? '')) {
      out.blockHeavyLegsUntil = c.blockHeavyLegsUntil
    }
    if (c.recoveryMode) out.recoveryMode = true
    if (c.compensation) out.compensation = { ...c.compensation, ...out.compensation }
    if (c.orientation) {
      const rank = (o: Orientation) => ORIENTATION_PRIORITY.indexOf(o.focus)
      if (!out.orientation || rank(c.orientation) < rank(out.orientation)) out.orientation = c.orientation
    }
    if (c.suspended) out.suspended = true
    if (c.reasons?.length) out.reasons = [...(out.reasons ?? []), ...c.reasons]
    if (c.dayReasons) {
      const merged = { ...(out.dayReasons ?? {}) }
      for (const [date, list] of Object.entries(c.dayReasons)) merged[date] = [...(merged[date] ?? []), ...list]
      out.dayReasons = merged
    }
  }
  return out
}

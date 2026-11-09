import type { SyncFields } from './sync'
import type { BodyZone } from './reference'

/** Les cinq items du questionnaire de bien-être du matin (McLean et al., 2010, adapté ; RC-6.2). */
export type WellnessItemKey = 'fatigue' | 'sommeil' | 'douleurs' | 'stress' | 'humeur'

/**
 * Sens des notes : de 1 à 5, **5 = meilleur état** pour chaque item (une baisse est donc toujours une dégradation).
 * - fatigue : 1 = épuisé, 5 = en forme
 * - sommeil : 1 = très mauvais, 5 = excellent
 * - douleurs musculaires : 1 = très douloureux, 5 = aucune douleur
 * - stress : 1 = très stressé, 5 = serein
 * - humeur : 1 = très mauvaise, 5 = excellente
 */
export const WELLNESS_ITEMS: readonly { key: WellnessItemKey; label: string; low: string; high: string }[] = [
  { key: 'fatigue', label: 'Fatigue', low: 'épuisé', high: 'en forme' },
  { key: 'sommeil', label: 'Sommeil', low: 'très mauvais', high: 'excellent' },
  { key: 'douleurs', label: 'Douleurs', low: 'très douloureux', high: 'aucune douleur' },
  { key: 'stress', label: 'Stress', low: 'très stressé', high: 'serein' },
  { key: 'humeur', label: 'Humeur', low: 'très mauvaise', high: 'excellente' },
]

export type WellnessScores = Record<WellnessItemKey, number>

/** Ressenti du matin : un seul par date (le dernier saisi remplace le précédent). */
export interface MorningWellness extends SyncFields {
  kind: 'matin'
  /** AAAA-MM-JJ */
  date: string
  scores: WellnessScores
  /** Douleur localisée facultative (RC-6.2). */
  painZone: BodyZone | null
}

export type RatingKind = 'club' | 'match'

/** Note de séance club ou de match : un seul enregistrement par date et par type. */
export interface SessionRating extends SyncFields {
  kind: RatingKind
  date: string
  /** Dureté CR-10, de 1 à 10 (RC-6.1). Absent tant que seules les minutes jouées sont saisies. */
  rpe: number | null
  durationMin: number | null
  /** Minutes jouées (matchs uniquement). */
  minutesPlayed: number | null
  /** Intensité des contacts, 1 (faible) à 5 (très forte), facultative (RC-7.1). */
  contactIntensity: number | null
}

export type WellnessEntry = MorningWellness | SessionRating

export const RATING_RPE_MIN = 1
export const RATING_RPE_MAX = 10
export const CONTACT_MIN = 1
export const CONTACT_MAX = 5

/** Plages de minutes jouées proposées en un geste ; `minutes` est la valeur enregistrée pour la plage. */
export const MINUTES_PLAYED_BANDS: readonly { label: string; minutes: number }[] = [
  { label: 'Pas joué', minutes: 0 },
  { label: 'Moins de 20 min', minutes: 10 },
  { label: '20 à 59 min', minutes: 40 },
  { label: '60 min ou plus', minutes: 80 },
]

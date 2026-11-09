import type { SyncFields, WithoutSync } from './sync'

/** Jour de semaine ISO : 1 = lundi … 7 = dimanche. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]

export type ClubIntensity = 'lourd' | 'normal'
export const CLUB_INTENSITIES: { value: ClubIntensity; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'lourd', label: 'Lourd' },
]

export const DEFAULT_CLUB_DURATION_MIN = 90

/** Entraînement club récurrent, chaque semaine. */
export interface ClubDay extends SyncFields {
  weekday: Weekday
  intensity: ClubIntensity
  /** Durée habituelle en minutes. */
  durationMin: number
}
export type ClubDayInput = WithoutSync<ClubDay>

/** Match ponctuel. Aucun match dans la semaine = « semaine sans match » (implicite, rien n'est stocké). */
export interface Match extends SyncFields {
  /** Date locale AAAA-MM-JJ. */
  date: string
  /** Heure locale HH:MM, facultative. */
  time: string | null
}
export type MatchInput = WithoutSync<Match>

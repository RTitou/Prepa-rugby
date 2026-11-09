import type { SyncFields, WithoutSync } from './sync'

export const MIN_AGE = 18

export type Sex = 'homme' | 'femme'
export const SEXES: { value: Sex; label: string }[] = [
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
]

export type Line = 'avants' | 'arrieres'
export type Subgroup =
  | 'premiere-ligne'
  | 'deuxieme-ligne'
  | 'troisieme-ligne'
  | 'demis'
  | 'centres'
  | 'ailiers-arriere'

export const LINE_LABELS: Record<Line, string> = { avants: 'Avants', arrieres: 'Arrières' }
export const SUBGROUP_LABELS: Record<Subgroup, string> = {
  'premiere-ligne': 'Première ligne',
  'deuxieme-ligne': 'Deuxième ligne',
  'troisieme-ligne': 'Troisième ligne',
  demis: 'Demis',
  centres: 'Centres',
  'ailiers-arriere': 'Ailiers et arrière',
}

/** Numéro de maillot du rugby à XV. */
export type PositionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15

export interface PositionInfo {
  number: PositionNumber
  label: string
  line: Line
  subgroup: Subgroup
}

export const POSITIONS: readonly PositionInfo[] = [
  { number: 1, label: 'Pilier gauche', line: 'avants', subgroup: 'premiere-ligne' },
  { number: 2, label: 'Talonneur', line: 'avants', subgroup: 'premiere-ligne' },
  { number: 3, label: 'Pilier droit', line: 'avants', subgroup: 'premiere-ligne' },
  { number: 4, label: '2e ligne', line: 'avants', subgroup: 'deuxieme-ligne' },
  { number: 5, label: '2e ligne', line: 'avants', subgroup: 'deuxieme-ligne' },
  { number: 6, label: '3e ligne aile', line: 'avants', subgroup: 'troisieme-ligne' },
  { number: 7, label: '3e ligne aile', line: 'avants', subgroup: 'troisieme-ligne' },
  { number: 8, label: 'N°8', line: 'avants', subgroup: 'troisieme-ligne' },
  { number: 9, label: 'Demi de mêlée', line: 'arrieres', subgroup: 'demis' },
  { number: 10, label: "Demi d'ouverture", line: 'arrieres', subgroup: 'demis' },
  { number: 11, label: 'Ailier', line: 'arrieres', subgroup: 'ailiers-arriere' },
  { number: 12, label: 'Centre', line: 'arrieres', subgroup: 'centres' },
  { number: 13, label: 'Centre', line: 'arrieres', subgroup: 'centres' },
  { number: 14, label: 'Ailier', line: 'arrieres', subgroup: 'ailiers-arriere' },
  { number: 15, label: 'Arrière', line: 'arrieres', subgroup: 'ailiers-arriere' },
]

export function getPosition(number: PositionNumber): PositionInfo {
  const info = POSITIONS.find((p) => p.number === number)
  if (!info) throw new Error(`Poste inconnu : ${number}`)
  return info
}

/** Ligne (avants/arrières) déduite du poste. */
export function lineOf(number: PositionNumber): Line {
  return getPosition(number).line
}

/** Sous-groupe déduit du poste. */
export function subgroupOf(number: PositionNumber): Subgroup {
  return getPosition(number).subgroup
}

/** Échelle du niveau de jeu, du plus bas au plus haut. L'ordre sert à trouver le « niveau au-dessus ». */
export type PlayLevel = 'loisir' | 'regional' | 'federale' | 'nationale' | 'espoirs' | 'pro'

export interface PlayLevelInfo {
  value: PlayLevel
  label: string
  description: string
}

export const PLAY_LEVELS: readonly PlayLevelInfo[] = [
  { value: 'loisir', label: 'Loisir', description: 'Rugby loisir, corporatif, sans compétition suivie' },
  { value: 'regional', label: 'Régional / Honneur', description: 'Promotion Honneur, Honneur, Excellence, séries régionales' },
  { value: 'federale', label: 'Fédérale', description: 'Fédérale 3, 2 et 1' },
  { value: 'nationale', label: 'Nationale', description: 'Nationale 2 et Nationale' },
  { value: 'espoirs', label: 'Espoirs / centre de formation', description: 'Espoirs, académie, centre de formation de club pro' },
  { value: 'pro', label: 'Professionnel', description: 'Pro D2, Top 14 ou équivalent' },
]

export type LiftingExperience = 'moins-6-mois' | '6-24-mois' | 'plus-24-mois'
export const LIFTING_EXPERIENCES: { value: LiftingExperience; label: string }[] = [
  { value: 'moins-6-mois', label: 'Moins de 6 mois' },
  { value: '6-24-mois', label: 'De 6 à 24 mois' },
  { value: 'plus-24-mois', label: 'Plus de 24 mois' },
]

/** Qualité que le joueur veut améliorer en priorité. */
export type TrainingGoal = 'puissance' | 'force-hypertrophie' | 'explosivite' | 'endurance'

export const TRAINING_GOALS: { value: TrainingGoal; label: string; description: string }[] = [
  { value: 'puissance', label: 'Puissance', description: 'Pousser, plaquer et déblayer plus fort : épaulés, sauts chargés, lancers.' },
  { value: 'force-hypertrophie', label: 'Force / hypertrophie', description: 'Devenir plus fort et prendre du muscle : plus de séries lourdes et de volume.' },
  { value: 'explosivite', label: 'Explosivité / réactivité', description: 'Démarrer et changer d’appui plus vite : pliométrie, appuis courts, sprints.' },
  { value: 'endurance', label: 'Endurance / cardio', description: 'Tenir 80 minutes et répéter les efforts : plus de conditionnement.' },
]

export function goalLabel(goal: TrainingGoal): string {
  return TRAINING_GOALS.find((g) => g.value === goal)?.label ?? goal
}

/** Objectifs du joueur : un principal, un secondaire facultatif (différent du principal). */
export interface TrainingGoals {
  primary: TrainingGoal
  secondary: TrainingGoal | null
}

/** Phase de saison : en saison (défaut) ou intersaison ATP de 9 semaines à partir d'un lundi (AAAA-MM-JJ). */
export type TrainingPhase = { kind: 'saison' } | { kind: 'intersaison'; startMonday: string }

/** Profil du joueur (une seule ligne active dans la table). */
export interface Profile extends SyncFields {
  /** Âge en années à la dernière modification du profil (18 ou plus). */
  age: number
  sex: Sex
  position: PositionNumber
  heightCm: number
  weightKg: number
  level: PlayLevel
  liftingExperience: LiftingExperience
  /** Absent = en saison. Champ non indexé : aucune migration Dexie. */
  trainingPhase?: TrainingPhase
  /** Points à améliorer choisis par le joueur ; absent = aucun accent particulier. */
  goals?: TrainingGoals
}

export type ProfileInput = WithoutSync<Profile>

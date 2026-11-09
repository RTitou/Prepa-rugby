import type { PositionNumber, Subgroup } from '../../types/profile'
import { getPosition } from '../../types/profile'
import type { EvidenceLevel, ExerciseCategory } from '../../types/reference'

/*
 * Accents de préparation par sous-groupe de postes, justifiés par la veille §2 (exigences du match par
 * poste) et ses règles candidates RC-2.1, RC-2.4, RC-8.2. Ce sont des orientations de conception
 * (preuve B/C), à valider par un préparateur physique : le moteur s'en sert pour pondérer, pas pour imposer.
 */

export type EmphasisWeight = 'prioritaire' | 'renforce'

export type ConditioningStyle = 'contacts-poussees' | 'sprints-repetes' | 'pics-eleves' | 'mixte'

export interface EmphasisItem {
  category: ExerciseCategory
  weight: EmphasisWeight
}

export interface PositionEmphasis {
  subgroup: Subgroup
  /** Catégories à favoriser, de la plus prioritaire à la moins prioritaire. */
  priorities: EmphasisItem[]
  conditioning: ConditioningStyle
  /** Exercices de conditionnement propres au poste (ids de bibliothèque). */
  conditioningExerciseIds: string[]
  /** Justification issue de la veille. */
  rationale: string
  sourceIds: string[]
  evidence: EvidenceLevel
}

const CONTACT_COND = ['scrum-push-simulated', 'contact-circuit', 'sled-push-conditioning', 'burpee-ground-get-ups']
const SPRINT_COND = ['repeated-sprints', 'intermittent-15-15', 'peak-blocks-run', 'bike-intermittent']

export const POSITION_EMPHASIS: Record<Subgroup, PositionEmphasis> = {
  'premiere-ligne': {
    subgroup: 'premiere-ligne',
    priorities: [
      { category: 'cou', weight: 'prioritaire' },
      { category: 'force-haut', weight: 'prioritaire' },
      { category: 'force-bas', weight: 'renforce' },
      { category: 'tronc', weight: 'renforce' },
    ],
    conditioning: 'contacts-poussees',
    conditioningExerciseIds: CONTACT_COND,
    rationale:
      'Les avants subissent plus de collisions et d’efforts statiques que les arrières (Bridgeman & Gill 2021 ; Paul 2022). Chez les U20 internationaux, la première ligne parcourt le moins de distance (4,97 km) et a la course à haute vitesse la plus basse (≈ 212 m) : la vitesse est moins prioritaire que la force, le haut du corps et le cou (RC-8.2, Hislop 2017). Son pic d’une minute (≈ 154 m/min, Read 2018) doit être conditionné à part (RC-2.1), avec contacts simulés et poussées (RC-2.4).',
    sourceIds: ['cunningham-2016', 'bridgeman-gill-2021', 'paul-2022', 'read-2018', 'hislop-2017'],
    evidence: 'B',
  },
  'deuxieme-ligne': {
    subgroup: 'deuxieme-ligne',
    priorities: [
      { category: 'force-bas', weight: 'prioritaire' },
      { category: 'force-haut', weight: 'prioritaire' },
      { category: 'cou', weight: 'renforce' },
      { category: 'puissance', weight: 'renforce' },
    ],
    conditioning: 'contacts-poussees',
    conditioningExerciseIds: CONTACT_COND,
    rationale:
      'Avants : collisions et efforts statiques plus nombreux (Bridgeman & Gill 2021). Le cou est renforcé pour tous les avants (RC-8.2). Orientation de conception : force des avants en priorité (Jones 2016, opinion d’auteurs, niveau C) ; la veille ne donne pas de chiffre propre aux deuxièmes lignes dans le texte consulté (Cunningham 2016).',
    sourceIds: ['bridgeman-gill-2021', 'cunningham-2016', 'jones-2016-nsca', 'hislop-2017'],
    evidence: 'C',
  },
  'troisieme-ligne': {
    subgroup: 'troisieme-ligne',
    priorities: [
      { category: 'puissance', weight: 'prioritaire' },
      { category: 'force-bas', weight: 'prioritaire' },
      { category: 'vitesse', weight: 'renforce' },
      { category: 'cou', weight: 'renforce' },
    ],
    conditioning: 'mixte',
    conditioningExerciseIds: [...CONTACT_COND.slice(1), ...SPRINT_COND.slice(0, 2)],
    rationale:
      'Les troisièmes lignes cumulent beaucoup de contacts (impacts > 5 G chez les U19) et une course à haute vitesse nettement supérieure à celle des autres avants (≈ 360 m en U20 internationaux, Cunningham 2016 ; Bridgeman & Gill 2021). Profil mixte : puissance et vitesse en plus de la force, conditionnement qui combine contacts et sprints répétés.',
    sourceIds: ['cunningham-2016', 'bridgeman-gill-2021', 'hislop-2017'],
    evidence: 'B',
  },
  demis: {
    subgroup: 'demis',
    priorities: [
      { category: 'vitesse', weight: 'prioritaire' },
      { category: 'puissance', weight: 'prioritaire' },
      { category: 'force-bas', weight: 'renforce' },
      { category: 'cou', weight: 'renforce' },
    ],
    conditioning: 'pics-eleves',
    conditioningExerciseIds: ['peak-blocks-run', 'intermittent-15-15', 'repeated-sprints', 'bike-intermittent'],
    rationale:
      'Les demis de mêlée atteignent les plus hauts pics d’intensité (185 m/min sur 1 minute en académie, Read 2018) et doivent être conditionnés à part (RC-2.1, RC-2.2). Course à haute vitesse ≈ 476 m en U20 internationaux (Cunningham 2016) : vitesse et puissance en priorité.',
    sourceIds: ['read-2018', 'cunningham-2016', 'bridgeman-gill-2021'],
    evidence: 'B',
  },
  centres: {
    subgroup: 'centres',
    priorities: [
      { category: 'puissance', weight: 'prioritaire' },
      { category: 'vitesse', weight: 'prioritaire' },
      { category: 'force-bas', weight: 'renforce' },
      { category: 'force-haut', weight: 'renforce' },
    ],
    conditioning: 'sprints-repetes',
    conditioningExerciseIds: SPRINT_COND,
    rationale:
      'Chez les U20 internationaux, les centres ont la plus grande distance totale (6,51 km) et un nombre de sprints très élevé (≈ 28) ; les arrières privilégient les sprints répétés et le travail proche de la vitesse maximale (RC-2.4, Cunningham 2016). Ils restent exposés aux contacts : base de force du haut du corps maintenue.',
    sourceIds: ['cunningham-2016', 'bridgeman-gill-2021', 'read-2018'],
    evidence: 'B',
  },
  'ailiers-arriere': {
    subgroup: 'ailiers-arriere',
    priorities: [
      { category: 'vitesse', weight: 'prioritaire' },
      { category: 'puissance', weight: 'prioritaire' },
      { category: 'force-bas', weight: 'renforce' },
      { category: 'ischios-excentrique', weight: 'renforce' },
    ],
    conditioning: 'sprints-repetes',
    conditioningExerciseIds: SPRINT_COND,
    rationale:
      'Le triangle arrière a la course à haute vitesse la plus élevée (≈ 728 m en U20 internationaux) et environ 29 sprints (Cunningham 2016) ; les arrières font 2 à 3 fois plus de course à haute vitesse que les avants (Bridgeman & Gill 2021). Vitesse maximale et sprints répétés en priorité (RC-2.4) ; travail excentrique des ischios renforcé car l’exposition au sprint est élevée (preuves débattues pour le Nordic).',
    sourceIds: ['cunningham-2016', 'bridgeman-gill-2021', 'van-dyk-2019', 'impellizzeri-2021-nordic'],
    evidence: 'B',
  },
}

export function getPositionEmphasis(position: PositionNumber): PositionEmphasis {
  return POSITION_EMPHASIS[getPosition(position).subgroup]
}

// ---------------------------------------------------------------------------------------------
// Pics d'intensité de match (Read 2018, tableau 2.3 de la veille) pour calibrer le conditionnement
// ---------------------------------------------------------------------------------------------

export type PeakGroup =
  | 'premiere-ligne'
  | 'deuxieme-ligne'
  | 'troisieme-ligne'
  | 'demi-de-melee'
  | 'arrieres-interieurs'
  | 'arrieres-exterieurs'

export type PeakWindow = '15s' | '30s' | '1min' | '2min' | '3min' | '5min' | '10min'

export interface PeakValue {
  /** Distance relative maximale sur la fenêtre, en m/min. */
  mean: number
  sd: number
}

/**
 * m/min maximaux sur fenêtre glissante, académies anglaises (202 joueurs). Tableau reconstitué d'un PDF
 * mal mis en page : seules les valeurs à 1 min des premières lignes et des demis de mêlée sont confirmées
 * par le texte de l'article. À revérifier sur la publication originale (toVerify).
 */
export const MATCH_PEAKS = {
  sourceId: 'read-2018',
  evidence: 'B' as EvidenceLevel,
  toVerify: true,
  unit: 'm/min',
  values: {
    'premiere-ligne': { '15s': { mean: 245, sd: 32 }, '30s': { mean: 193, sd: 21 }, '1min': { mean: 154, sd: 17 }, '2min': { mean: 121, sd: 16 }, '3min': { mean: 106, sd: 14 }, '5min': { mean: 93, sd: 14 }, '10min': { mean: 80, sd: 12 } },
    'deuxieme-ligne': { '15s': { mean: 264, sd: 29 }, '30s': { mean: 207, sd: 19 }, '1min': { mean: 165, sd: 12 }, '2min': { mean: 130, sd: 12 }, '3min': { mean: 115, sd: 14 }, '5min': { mean: 100, sd: 12 }, '10min': { mean: 87, sd: 9 } },
    'troisieme-ligne': { '15s': { mean: 280, sd: 36 }, '30s': { mean: 217, sd: 23 }, '1min': { mean: 168, sd: 19 }, '2min': { mean: 132, sd: 15 }, '3min': { mean: 116, sd: 14 }, '5min': { mean: 102, sd: 14 }, '10min': { mean: 88, sd: 11 } },
    'demi-de-melee': { '15s': { mean: 298, sd: 44 }, '30s': { mean: 233, sd: 25 }, '1min': { mean: 185, sd: 20 }, '2min': { mean: 146, sd: 19 }, '3min': { mean: 132, sd: 17 }, '5min': { mean: 116, sd: 14 }, '10min': { mean: 97, sd: 13 } },
    'arrieres-interieurs': { '15s': { mean: 297, sd: 33 }, '30s': { mean: 245, sd: 23 }, '1min': { mean: 172, sd: 19 }, '2min': { mean: 135, sd: 16 }, '3min': { mean: 120, sd: 14 }, '5min': { mean: 106, sd: 12 }, '10min': { mean: 92, sd: 10 } },
    'arrieres-exterieurs': { '15s': { mean: 299, sd: 42 }, '30s': { mean: 224, sd: 30 }, '1min': { mean: 170, sd: 22 }, '2min': { mean: 133, sd: 17 }, '3min': { mean: 118, sd: 15 }, '5min': { mean: 104, sd: 14 }, '10min': { mean: 89, sd: 11 } },
  } satisfies Record<PeakGroup, Record<PeakWindow, PeakValue>>,
}

/** Groupe de pics de la veille pour un poste (RC-2.1 : arrières intérieurs = 10, 12, 13 ; triangle arrière = 11, 14, 15). */
export function peakGroupOf(position: PositionNumber): PeakGroup {
  switch (getPosition(position).number) {
    case 1:
    case 2:
    case 3:
      return 'premiere-ligne'
    case 4:
    case 5:
      return 'deuxieme-ligne'
    case 6:
    case 7:
    case 8:
      return 'troisieme-ligne'
    case 9:
      return 'demi-de-melee'
    case 10:
    case 12:
    case 13:
      return 'arrieres-interieurs'
    default:
      return 'arrieres-exterieurs'
  }
}

export function getMatchPeak(position: PositionNumber, window: PeakWindow): PeakValue {
  return MATCH_PEAKS.values[peakGroupOf(position)][window]
}

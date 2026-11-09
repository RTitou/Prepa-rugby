import type { Line, PlayLevel, Sex } from './profile'
import type { RecordTest } from './records'

/** Niveau de preuve de la veille : A (revue, essai, consensus), B (cohorte, transversale), C (avis, terrain, non vérifié). */
export type EvidenceLevel = 'A' | 'B' | 'C'

/** Référence bibliographique de la veille (§13). */
export interface Source {
  id: string
  authors: string
  /** null quand la veille ne donne pas d’année de publication (pages en ligne). */
  year: number | null
  title: string
  /** Revue, éditeur ou organisme. */
  venue: string
  doi?: string
  url?: string
  evidence: EvidenceLevel
  /** Numéro dans la bibliographie de la veille, quand il existe. */
  bibliographyRef?: number
}

/** Zones corporelles déclarables (tableau 8.4 de la veille). */
export type BodyZone =
  | 'tete'
  | 'cou'
  | 'epaule'
  | 'coude-poignet-main'
  | 'bas-du-dos'
  | 'ischios'
  | 'quadriceps-adducteurs-aine'
  | 'genou'
  | 'cheville-pied'
  | 'mollet-achille'

export const BODY_ZONES: readonly { value: BodyZone; label: string }[] = [
  { value: 'tete', label: 'Tête (commotion)' },
  { value: 'cou', label: 'Cou' },
  { value: 'epaule', label: 'Épaule' },
  { value: 'coude-poignet-main', label: 'Coude, poignet, main' },
  { value: 'bas-du-dos', label: 'Bas du dos' },
  { value: 'ischios', label: 'Ischios' },
  { value: 'quadriceps-adducteurs-aine', label: 'Quadriceps, adducteurs, aine' },
  { value: 'genou', label: 'Genou' },
  { value: 'cheville-pied', label: 'Cheville, pied' },
  { value: 'mollet-achille', label: 'Mollet, tendon d’Achille' },
]

// ---------------------------------------------------------------------------------------------
// Repères de performance
// ---------------------------------------------------------------------------------------------

export type NormUnit = 'kg' | 'kg/kg' | 's'

/** Catégorie d'âge de la cohorte d'origine des valeurs. */
export type NormAgeGroup = 'u18' | 'u20-21' | 'senior-pro'

export interface NormProtocol {
  id: string
  /** Exercice de référence (id de bibliothèque) quand il s'agit d'une charge. */
  exerciseId: string | null
  rm: '1RM' | '3RM' | null
  /** Vrai si la valeur est un rapport charge / poids de corps. */
  relativeToBodyweight: boolean
  description: string
}

export interface Norm {
  id: string
  sex: Sex
  line: Line
  /** Niveau de jeu de l'application auquel le repère est rattaché. */
  level: PlayLevel
  ageGroup: NormAgeGroup
  test: RecordTest
  mean: number
  /** Écart-type, quand il est connu. */
  sd?: number
  unit: NormUnit
  protocol: NormProtocol
  sourceId: string
  evidence: EvidenceLevel
  /** Valeur à revérifier sur la publication originale (extraction de tableau incertaine). */
  toVerify: boolean
  /** Rattachement par proximité, sans donnée publiée pour ce niveau. */
  estimate: boolean
  note?: string
}

// ---------------------------------------------------------------------------------------------
// Exercices
// ---------------------------------------------------------------------------------------------

export type ExerciseCategory =
  | 'force-bas'
  | 'force-haut'
  | 'puissance'
  | 'vitesse'
  | 'conditionnement'
  | 'aerobie-leger'
  | 'mobilite-recuperation'
  | 'tronc'
  | 'cou'
  | 'ischios-excentrique'
  | 'prevention'

export const EXERCISE_CATEGORIES: readonly { value: ExerciseCategory; label: string }[] = [
  { value: 'force-bas', label: 'Force du bas du corps' },
  { value: 'force-haut', label: 'Force du haut du corps' },
  { value: 'puissance', label: 'Puissance et pliométrie' },
  { value: 'vitesse', label: 'Vitesse' },
  { value: 'conditionnement', label: 'Conditionnement' },
  { value: 'aerobie-leger', label: 'Aérobie léger' },
  { value: 'mobilite-recuperation', label: 'Mobilité et récupération' },
  { value: 'tronc', label: 'Tronc et gainage' },
  { value: 'cou', label: 'Cou' },
  { value: 'ischios-excentrique', label: 'Ischios en excentrique' },
  { value: 'prevention', label: 'Prévention' },
]

export type ImpactLevel = 'faible' | 'moyen' | 'fort'
export const IMPACT_ORDER: Record<ImpactLevel, number> = { faible: 0, moyen: 1, fort: 2 }

export type Equipment =
  | 'poids-du-corps'
  | 'barre'
  | 'halteres'
  | 'kettlebell'
  | 'rack'
  | 'banc'
  | 'barre-de-traction'
  | 'machine'
  | 'poulie'
  | 'elastique'
  | 'medecine-ball'
  | 'box'
  | 'traineau'
  | 'velo'
  | 'rameur'
  | 'ski-erg'
  | 'ergometre-a-bras'
  | 'cordes'
  | 'sac-de-plaquage'
  | 'partenaire'
  | 'plots'
  | 'piscine'
  | 'rouleau'
  | 'glissieres'

export interface Exercise {
  /** Identifiant stable : ne jamais le renommer (référencé par les séances enregistrées). */
  id: string
  name: string
  /** Consignes courtes. */
  instructions: string
  category: ExerciseCategory
  /** Zones corporelles significativement sollicitées. */
  zones: BodyZone[]
  impact: ImpactLevel
  /** Charge appliquée le long de la colonne (barre sur le dos, etc.). */
  axialLoad: boolean
  equipment: Equipment[]
  /** Séance de conditionnement calibrable sur les pics du poste (tableau 2.3 de la veille). */
  peakCalibrated?: boolean
  /** Remarque sur le niveau de preuve ou la prudence. */
  evidenceNote?: string
}

// ---------------------------------------------------------------------------------------------
// Substitutions
// ---------------------------------------------------------------------------------------------

export interface SubstitutionRule {
  zone: BodyZone
  label: string
  /** Vrai : le plan entier est suspendu (commotion). */
  suspend: boolean
  /** Exclut tout exercice, quelle que soit sa zone (commotion). */
  excludeAll: boolean
  /** Exclut tout exercice qui sollicite l'une de ces zones. */
  excludeZones: BodyZone[]
  /** Exclut les exercices à charge axiale. */
  excludeAxialLoad: boolean
  /** Exclut les exercices dont l'impact atteint ce niveau. */
  excludeImpactAtLeast?: ImpactLevel
  /** Exercices nommés dans le tableau, exclus explicitement. */
  excludeExerciseIds: string[]
  /** Éléments cités par le tableau mais absents de la bibliothèque (ex. pont de lutte). */
  excludeNotes: string[]
  /** Exercices de remplacement possibles (si indolores). */
  substituteIds: string[]
  /** Message obligatoire à afficher. */
  message: string
  /** Précision de consultation médicale propre à la zone. */
  medicalAdvice?: string
  /** Contenu du tableau non modélisé (ex. « côté sain en unilatéral »). */
  notModeled?: string[]
  /** Reprise du jeu (commotion). */
  returnToPlay?: { minDaysBeforePlaying: number; stageMinHours: number; description: string }
  reviewedByPhysio: false
  sourceIds: string[]
  evidence: EvidenceLevel
}

export interface SevereSign {
  id: string
  label: string
}

// ---------------------------------------------------------------------------------------------
// Échauffement de prévention
// ---------------------------------------------------------------------------------------------

export type WarmupComponent =
  | 'general'
  | 'mobilite'
  | 'equilibre'
  | 'renforcement'
  | 'cou'
  | 'pliometrie'
  | 'reception-appuis'
  | 'montee-intensite'

export interface WarmupStep {
  id: string
  order: number
  component: WarmupComponent
  title: string
  instructions: string
  durationMin: number
  exerciseIds: string[]
}

export interface WarmupProgramme {
  id: 'complet' | 'court'
  label: string
  steps: WarmupStep[]
  /** Les durées sont une estimation de conception, pas une donnée de la veille. */
  durationsAreEstimates: true
  reviewedByPhysio: false
  sourceIds: string[]
  note: string
}

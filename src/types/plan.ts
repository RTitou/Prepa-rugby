import type { ClubIntensity, Weekday } from './calendar'
import type { LiftingExperience, PositionNumber, Sex, TrainingGoals } from './profile'
import type { RecordTest } from './records'
import type { BodyZone, WarmupStep } from './reference'
import type { SyncFields } from './sync'

/** Provenance d'une raison : qui a modifié ou justifié le plan. Les phases 5 à 7 ajoutent leurs raisons avec leur source. */
export type ReasonSource = 'moteur' | 'ressenti' | 'charge' | 'records' | 'blessure'

/** Raison affichable d'un choix ou d'une modification du plan (une phrase). */
export interface PlanReason {
  /** Code stable, utile aux tests et aux filtres (ex. « deload », « bas-48h »). */
  code: string
  text: string
  source: ReasonSource
}

/** Type d'un jour de la semaine. */
export type DayKind = 'match' | 'club-lourd' | 'club-normal' | 'seance' | 'recuperation' | 'activation' | 'repos'

export type SessionKind = 'muscu' | 'conditionnement' | 'recuperation' | 'activation'

/**
 * Gabarit de contenu d'une séance de musculation.
 * - corps-entier : débutant (technique) ou séance mixte à volume modéré
 * - bas-force : force lourde du bas du corps (soumise à la règle des 48 h)
 * - haut : haut du corps, tronc et cou
 * - puissance : séance de puissance différenciée (plus de 24 mois)
 */
export type SessionSlot =
  | 'corps-entier'
  /** Méthode ATP, intersaison : un slot par jour de la semaine type. */
  | 'atp-lower'
  | 'atp-upper'
  | 'atp-conditioning'
  | 'atp-accessoire'
  | 'atp-terrain'
  | 'atp-full'
  | 'atp-recup'
  | 'bas-force'
  | 'haut'
  | 'puissance'
  | 'conditionnement'
  | 'recuperation'
  | 'activation'
  /** Séance courte de sprints et d'intermittent après un match peu ou pas joué (§7.3 de la veille). */
  | 'compensation'

export type BlockKind =
  | 'vitesse'
  | 'puissance'
  | 'force'
  | 'accessoire'
  | 'tronc'
  | 'cou'
  | 'prevention'
  | 'conditionnement'
  | 'recuperation'
  | 'echauffement'
  | 'test'
  | 'finisher'
  | 'terrain'

/** Lettre de bloc ATP : A échauffement, B puissance, C force, D/E renforcement (superset), F finisher. */
export type BlockLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

/** Une série d'une vague de force ATP (6-4-2-4-6, 5-3-1-3-5, top set + back-off). */
export interface WaveSet {
  reps: number
  /** Fourchette en fraction du 1RM (ex. [0.78, 0.82]) ; null quand la charge se cherche (série au max, top set). */
  pctOneRm: [number, number] | null
  /** Série « le plus lourd possible » : aucune charge imposée, seul le RPE plafond compte. */
  toMax?: boolean
  /** Back-off des semaines 7-8 : fraction de la charge du top set du jour, à la place d'un % du 1RM. */
  pctTopSet?: [number, number]
  /** RPE propre à la série (ex. débutant : série au max remplacée par 2 reps à RPE 8). */
  rpe?: number
}

export type PrescriptionUnit = 'reps' | 's' | 'min'

/** Prescription d'un exercice : séries × répétitions @ RPE (RC-5.2). */
export interface PrescribedSet {
  sets: number
  reps: number
  /** Fourchette haute (ex. 8-12) ; absent si la valeur est fixe. */
  repsMax?: number
  unit: PrescriptionUnit
  /** RPE cible (échelle 1-10, demi-points acceptés) ; null pour un travail sans charge (mobilité). */
  targetRpe: number | null
  /** Méthode ATP : fourchette en fraction du 1RM (ex. [0.8, 0.85]) ; le kg conseillé en découle directement. */
  pctOneRm?: [number, number]
  /** Méthode ATP : une entrée par série (vague) ; `sets` vaut alors `waves.length`. */
  waves?: WaveSet[]
  /** Répétitions par côté (« 5/5 ») : affichage seulement. */
  perSide?: boolean
}

export interface PrescribedExercise {
  exerciseId: string
  block: BlockKind
  prescription: PrescribedSet
  /** Consigne propre à la séance (ex. pic de poste visé). */
  note?: string
  /** Point d'extension de la phase 7 : exercice remplacé par celui-ci. */
  replaces?: { exerciseId: string; zone?: string }
  /** Méthode ATP : lettre du bloc ; plusieurs exercices de la même lettre forment un superset. Absent sur les séances anciennes. */
  group?: BlockLetter
  /** Exercice facultatif (finisher, « si tu as le temps ») : compté hors durée obligatoire. */
  optional?: boolean
  /** Récupération entre les séries, en secondes [min, max]. */
  restSec?: [number, number]
}

export type WarmupVersion = 'complet' | 'court'

export interface Session {
  /** Identifiant stable et lisible : `s-AAAA-MM-JJ-<slot>`. Sert d'URL (/seance/:id). */
  id: string
  date: string
  kind: SessionKind
  slot: SessionSlot
  title: string
  /** Sous-titre court (ex. « haut du corps »). */
  focus: string
  durationMin: number
  /** RPE cible le plus élevé de la séance (hors échauffement). */
  maxRpe: number | null
  /** Séance facultative (activation légère à MD-1). */
  optional: boolean
  warmup: {
    version: WarmupVersion
    durationMin: number
    /** Étapes adaptées aux blessures (phase 7) ; absent = programme standard de `version`. */
    steps?: WarmupStep[]
    /** Zones prises en compte pour adapter l'échauffement (absent = non adapté). */
    adaptedZones?: BodyZone[]
  }
  exercises: PrescribedExercise[]
  /** Accents de poste appliqués (libellés). */
  accents: string[]
  /** Semaine allégée : volume réduit. */
  deload: boolean
  status: 'prevue' | 'faite'
  /** Journal lié une fois la séance terminée. */
  logId: string | null
  /** Raisons des choix et modifications ; les phases 5 à 7 y ajoutent les leurs. */
  reasons: PlanReason[]
  /** Méthode ATP : semaine du programme d'intersaison (1 à 9) ; absent en saison. */
  programWeek?: number
  /** Méthode ATP : tests passés pendant la séance (S1, S9) ; leur saisie se fait dans Records. */
  tests?: RecordTest[]
}

export interface DayPlan {
  /** AAAA-MM-JJ */
  date: string
  weekday: Weekday
  /** Décalage par rapport au match (0 = match, -1 = veille, +1 = lendemain) ; null sans match proche. */
  md: number | null
  /** Étiquette MD±n (« MD-1 ») ou null. */
  mdLabel: string | null
  kind: DayKind
  club: { intensity: ClubIntensity; durationMin: number } | null
  match: { time: string | null } | null
  session: Session | null
  reasons: PlanReason[]
  /** Jour conservé tel quel lors d'une régénération (passé ou séance faite). */
  locked: boolean
}

export interface WeekFlag extends PlanReason {
  /** Dates concernées (ex. les deux matchs trop rapprochés). */
  dates: string[]
}

/** Semaine générée, stockée dans la table plans. */
export interface WeekPlan extends SyncFields {
  /** Lundi de la semaine (AAAA-MM-JJ). */
  weekStart: string
  /** Empreinte des entrées (profil, calendrier, contexte) ayant produit cette semaine. */
  inputHash: string
  /** Semaine allégée (RC-5.3). Sert à compter les semaines depuis la dernière décharge. */
  isDeload: boolean
  /** Vrai si la semaine contient au moins un match. */
  hasMatch: boolean
  days: DayPlan[]
  /** Signalements de semaine (ex. deux matchs à moins de 72 h, traités en phase 5). */
  flags: WeekFlag[]
  generatedAt: string
}

/** Série saisie par le joueur. */
export interface LoggedSet {
  exerciseId: string
  /** Rang de la série dans l'exercice, à partir de 1. */
  setIndex: number
  loadKg: number | null
  reps: number | null
  rpe: number | null
  /** Case « fait » pour les exercices non chargés (temps, mobilité). */
  done: boolean
}

/** Séance réalisée (brouillon « en-cours » puis « terminee »). */
export interface SessionLog extends SyncFields {
  sessionId: string
  /** Date de la séance (AAAA-MM-JJ). */
  date: string
  weekStart: string
  title: string
  status: 'en-cours' | 'terminee'
  warmupDone: boolean
  sets: LoggedSet[]
  /** RPE global de séance, échelle CR-10 (0-10). Base de la charge sRPE (phase 5). */
  sessionRpe: number | null
  /** Durée réelle en minutes. */
  durationMin: number | null
  finishedAt: string | null
}

/** Données du joueur lues par le moteur. */
export interface PlanProfile {
  position: PositionNumber
  sex: Sex
  liftingExperience: LiftingExperience
  /** Semaine du programme d'intersaison ATP (1 à 9) ; null ou absent en saison. */
  programWeek?: number | null
  /** Objectifs du joueur (principal et secondaire) : accents ajoutés aux séances. */
  goals?: TrainingGoals
  /** Répétitions du test de force de la S1, par mouvement : le re-test de la S9 refait le même nombre. */
  testReps?: Partial<Record<AtpLift, number>>
}

/** Les trois mouvements de force de la méthode ATP (records correspondants). */
export type AtpLift = 'squat' | 'developpe-couche' | 'souleve-de-terre'

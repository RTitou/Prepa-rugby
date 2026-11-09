import type { LiftingExperience } from '../types/profile'

/*
 * Constantes et seuils du moteur de programme, centralisés pour rester ajustables (plan.md, Decisions).
 * Chaque valeur renvoie à une règle candidate de la veille (etat-de-l-art-prepa-rugby.md).
 */

/** Change quand les règles évoluent : fait régénérer les semaines (entrée du hash). */
export const ENGINE_VERSION = 3

// --- Méthode ATP (intersaison et structure de séance) ---------------------------------------------

/** Durée du programme d'intersaison ATP, en semaines. */
export const OFFSEASON_WEEKS = 9
/** Durées estimées (min) d'une séance ATP, hors finisher facultatif : estimation de conception, la source n'en donne aucune. */
export const ATP_DURATION_MIN = {
  salle: 70,
  terrain: 55,
  conditioning: 50,
  accessoire: 35,
  velo: 30,
  recup: 45,
  test: 60,
} as const
/** RPE des séries « au plus lourd possible » remplacées pour un débutant (moins de 6 mois) ou sous alerte de ressenti. */
export const ATP_BEGINNER_MAX_SET_RPE = 8

// --- Sauvegarde (phase 8) -----------------------------------------------------------------------

/** Rappel de sauvegarde : affiché quand la dernière sauvegarde date de PLUS de ce nombre de jours (ou n'existe pas). */
export const BACKUP_REMINDER_DAYS = 14

// --- Jours relatifs au match (§4.3) -------------------------------------------------------------

/** Jusqu'à ce nombre de jours après un match, le jour est étiqueté MD+n (sinon MD-n du match suivant). */
export const MD_PLUS_LABEL_DAYS = 2
/** Au-delà de cet écart (jours) aucun étiquetage MD±n. */
export const MD_LABEL_WINDOW_DAYS = 6
/** Heure supposée d'un match sans heure saisie, pour mesurer l'écart de 72 h. */
export const DEFAULT_MATCH_HOUR = 15
/** RC-4.5 : écart minimal entre deux matchs. */
export const MIN_HOURS_BETWEEN_MATCHES = 72

// --- Placement (RC-4.1 à RC-4.4) ----------------------------------------------------------------

/** RC-4.3 : écart minimal, en jours entiers, entre un match et une force lourde du bas du corps (48 h). */
export const MIN_DAYS_LOWER_HEAVY_FROM_MATCH = 2
/** RC-4.2 : séances de musculation par semaine avec match. */
export const MUSCU_SESSIONS_WITH_MATCH = 2
/** RC-4.2 / §4.4 : séances de musculation par semaine sans match. */
export const MUSCU_SESSIONS_NO_MATCH = 3
/**
 * Préférence de placement de la force du bas du corps selon l'étiquette MD (RC-4.3 : MD-3 d'abord).
 * MD+2 et MD+3 viennent après : Chéradame déconseille la séance la plus dure à MD+2 (§4.3).
 */
export const LOWER_HEAVY_MD_PREFERENCE: readonly number[] = [-3, -4, -5, -2, -6, 4, 3, 5, 2, 6]
/** Préférence pour le haut du corps : MD+2 (retour progressif, §4.3) puis les jours éloignés du match. */
export const UPPER_MD_PREFERENCE: readonly number[] = [2, -4, -5, 3, -3, -6, 4, -2, 5, 6]
/** Récupération active le lendemain du match (§4.3). */
export const RECOVERY_AT_MD_PLUS_1 = true
/** Activation légère facultative à MD-1 (§4.3). */
export const ACTIVATION_AT_MD_MINUS_1 = true
/** Hypothèse : le club ne fait pas de vitesse maximale (RC-4.4). Si vrai, aucun rappel de vitesse n'est ajouté. */
export const CLUB_DOES_MAX_SPEED = false
/** Séances de conditionnement en semaine sans match (§4.4 : 1 à 2 ; une seule pour un amateur). */
export const CONDITIONING_SESSIONS_NO_MATCH = 1
/** RC-5.4 : écart minimal entre une séance de puissance et un conditionnement le même jour. */
export const MIN_HOURS_POWER_TO_CONDITIONING = 3

// --- Niveau de départ (RC-5.1) ------------------------------------------------------------------

export interface LevelConfig {
  label: string
  /** Séances de musculation complètes par semaine, au plus. */
  maxMuscuSessions: number
  /** RPE cible maximal de toute la musculation. */
  rpeCap: number
  /** Séance de force/puissance différenciées (plus de 24 mois). */
  differentiated: boolean
  /** Séances « corps entier » techniques plutôt que haut/bas. */
  fullBody: boolean
}

export const LEVELS: Record<LiftingExperience, LevelConfig> = {
  'moins-6-mois': { label: 'Technique', maxMuscuSessions: 2, rpeCap: 8, differentiated: false, fullBody: true },
  '6-24-mois': { label: 'Force', maxMuscuSessions: 3, rpeCap: 9, differentiated: false, fullBody: false },
  'plus-24-mois': { label: 'Force et puissance', maxMuscuSessions: 3, rpeCap: 9, differentiated: true, fullBody: false },
}

// --- Prescription (RC-5.2) ----------------------------------------------------------------------

export interface Scheme {
  sets: number
  reps: number
  repsMax?: number
  rpe: number
}

export type SchemeKind = 'principal' | 'secondaire' | 'accessoire' | 'puissance' | 'tronc' | 'cou'

/** Séries × reps @ RPE par niveau et type d'exercice. Le RPE est plafonné par `rpeCap` du niveau. */
export const SCHEMES: Record<LiftingExperience, Record<SchemeKind, Scheme>> = {
  'moins-6-mois': {
    principal: { sets: 3, reps: 8, rpe: 7 },
    secondaire: { sets: 3, reps: 10, rpe: 6 },
    accessoire: { sets: 2, reps: 12, rpe: 6 },
    puissance: { sets: 3, reps: 4, rpe: 6 },
    tronc: { sets: 2, reps: 10, rpe: 6 },
    cou: { sets: 2, reps: 10, rpe: 6 },
  },
  '6-24-mois': {
    principal: { sets: 4, reps: 5, rpe: 8 },
    secondaire: { sets: 3, reps: 8, repsMax: 10, rpe: 7 },
    accessoire: { sets: 3, reps: 10, repsMax: 12, rpe: 7 },
    puissance: { sets: 3, reps: 5, rpe: 7 },
    tronc: { sets: 3, reps: 12, rpe: 7 },
    cou: { sets: 2, reps: 12, rpe: 7 },
  },
  'plus-24-mois': {
    principal: { sets: 5, reps: 3, repsMax: 5, rpe: 8 },
    secondaire: { sets: 3, reps: 6, repsMax: 8, rpe: 8 },
    accessoire: { sets: 3, reps: 10, repsMax: 12, rpe: 7 },
    puissance: { sets: 4, reps: 4, rpe: 8 },
    tronc: { sets: 3, reps: 12, rpe: 7 },
    cou: { sets: 3, reps: 12, rpe: 7 },
  },
}

/** Exercices tenus dans le temps : durée de la série en secondes par niveau (remplace les répétitions). */
export const TIMED_EXERCISES: Record<string, Record<LiftingExperience, number>> = {
  plank: { 'moins-6-mois': 20, '6-24-mois': 30, 'plus-24-mois': 40 },
  'side-plank': { 'moins-6-mois': 20, '6-24-mois': 30, 'plus-24-mois': 40 },
  'neck-isometric': { 'moins-6-mois': 10, '6-24-mois': 10, 'plus-24-mois': 10 },
}

/** Blocs d'accent de poste ajoutés au plus par séance (garde la séance dans une durée raisonnable). */
export const MAX_ACCENT_BLOCKS_PER_SESSION = 2

/** Durée moyenne d'une série (réalisation + repos), en minutes, pour estimer la durée d'une séance. */
export const MINUTES_PER_SET: Record<SchemeKind, number> = {
  principal: 3,
  secondaire: 2.5,
  accessoire: 2,
  puissance: 2.5,
  tronc: 1.5,
  cou: 1.5,
}

// --- Semaine allégée (RC-5.3) -------------------------------------------------------------------

/** Une semaine allégée toutes les 5 semaines (veille : 4 à 6) : 4 semaines normales puis 1 allégée. */
export const DELOAD_EVERY_WEEKS = 5
/** Volume (séries) conservé pendant la semaine allégée (−40 %, veille : −30 à −50 %). */
export const DELOAD_VOLUME_FACTOR = 0.6
/** Baisse du RPE cible en semaine allégée. */
export const DELOAD_RPE_DROP = 1

// --- Vitesse (RC-4.4) ---------------------------------------------------------------------------

export const SPEED_REPS_DEFAULT = 4
/** Répétitions de sprint supplémentaires quand la vitesse est prioritaire pour le poste. */
export const SPEED_REPS_PRIORITY = 6
/** Placement du rappel de vitesse selon l'étiquette MD de la séance hôte : loin du match, frais (RC-4.4, §4.3). */
export const SPEED_MD_PREFERENCE: readonly number[] = [-3, -4, -2, -5, -6, 4, 3, 5, 6, 2]
export const SPEED_EXERCISES: readonly string[] = ['sprint-fly-30m', 'sprint-10m']

// --- Récupération et activation -----------------------------------------------------------------

export const RECOVERY_DURATION_MIN = 25
export const ACTIVATION_DURATION_MIN = 15
export const CONDITIONING_DURATION_MIN = 35

// --- Ressenti, charge, minutes jouées (phase 5) -------------------------------------------------
// Seuils tirés de la veille (§6, §7, §10) et adaptés aux adultes avec prudence. Tous sont « à ajuster pour amateurs » :
// les cohortes d'origine sont des pros ou des U18 d'académie, aucun seuil n'est validé pour un amateur adulte.

/** RC-6.2 : jours de ressenti minimum pour calculer un z-score individuel (sinon seuils absolus de repli). */
export const WELLNESS_BASELINE_MIN_DAYS = 14
/** Fenêtre (jours précédant la saisie) dans laquelle la base individuelle est calculée. Choix de conception. */
export const WELLNESS_BASELINE_WINDOW_DAYS = 28
/** RC-6.2 (convention de terrain, niveau C) : alerte si le z du score total est ≤ −1,5. */
export const WELLNESS_Z_TOTAL_ALERT = -1.5
/** RC-6.2 : ou si au moins deux items ont un z ≤ −1. */
export const WELLNESS_Z_ITEM_ALERT = -1
export const WELLNESS_Z_ITEM_ALERT_COUNT = 2
/**
 * Écart-type plancher (choix de conception, pas de la veille) : un joueur qui répond toujours pareil aurait un écart-type
 * nul et un z infini. Plancher de 0,75 point pour un item et de 2 points pour le total.
 */
export const WELLNESS_SD_FLOOR_ITEM = 0.75
export const WELLNESS_SD_FLOOR_TOTAL = 2
/** Seuils absolus de repli avant 14 jours (5 items de 1 à 5, total sur 25) : total ≤ 12 ou un item ≤ 2. */
export const WELLNESS_FALLBACK_TOTAL_MAX = 12
export const WELLNESS_FALLBACK_ITEM_MAX = 2

/** RC-6.3 (règle prudente alternative, niveau C) : alerte si la charge de la semaine dépasse de plus de 30 % la moyenne des 3 précédentes. */
export const LOAD_SPIKE_RATIO = 1.3
export const LOAD_PREVIOUS_WEEKS = 3
/** Semaines précédentes entièrement couvertes par des données, au minimum, pour juger une montée rapide (sinon pas d'alerte). */
export const LOAD_SPIKE_MIN_WEEKS_HISTORY = 2
/**
 * RC-10.1 : 1 500 UA par semaine hors appli (moyenne U18 d'académie hors match 1 217 UA + 1 écart-type 364, Phibbs 2018).
 * Le match est compté ici, d'où 2 000 UA (environ 500 UA de plus pour un match de 80 min à RPE 6). À ajuster pour amateurs.
 */
export const OUT_OF_APP_WEEKLY_LOAD_ALERT_UA = 2000
/** RC-10.2 : sommeil noté de 1 à 5 ; moyenne ≤ 2 sur 7 jours = faible (auto-déclaration, à lire en tendance, §10.3). */
export const SLEEP_WINDOW_DAYS = 7
export const SLEEP_MIN_ENTRIES = 4
export const SLEEP_MEAN_ALERT_MAX = 2

/** RC-6.4 : volume −30 à −50 % sous alerte. Une alerte : −40 % ; plusieurs : −50 %. */
export const ALERT_VOLUME_FACTOR = 0.6
export const ALERT_VOLUME_FACTOR_MULTI = 0.5
/** RC-6.4 : aucune série à RPE ≥ 9 sous alerte. */
export const ALERT_MAX_TARGET_RPE = 8
/** RC-10.1 : maintien minimal quand la charge hors appli est élevée (1 à 2 séances courtes). */
export const MAINTENANCE_MAX_MUSCU_SESSIONS = 2
/** RC-7.2 : volume et plafond de RPE de la semaine en mode récupération (deux matchs à moins de 72 h). */
export const RECOVERY_MODE_VOLUME_FACTOR = 0.5
export const RECOVERY_MODE_MAX_TARGET_RPE = 7

/** Durée d'un match pour pré-remplir la note (2 × 40 min). */
export const MATCH_DEFAULT_DURATION_MIN = 80

/** §7.3 : 60 min ou plus = titulaire complet ; de 20 à 59 min = partiel ou remplaçant ; moins de 20 min ou pas joué = compensation. */
export const MINUTES_FULL_MATCH = 60
export const MINUTES_PARTIAL_MATCH = 20
/** §7.1 : récupération en 72 h ; pas de jambes lourdes pendant ce délai tant que le ressenti n'est pas revenu à la normale. */
export const HEAVY_LEGS_BLOCK_DAYS = 3
/** RC-7.1 : intensité des contacts (1 à 5) à partir de laquelle la récupération est prolongée. */
export const CONTACT_HIGH_THRESHOLD = 4

/** §7.3 : compensation à MD+1 d'un joueur peu utilisé : 15-20 min, 4-6 sprints, 2-3 blocs intermittents calibrés sur les pics. */
export const COMPENSATION_FULL_DURATION_MIN = 20
export const COMPENSATION_FULL_SPRINTS = 5
export const COMPENSATION_FULL_BLOCKS = 3
/** §7.3 : compensation courte d'un remplaçant (20 à 59 min) : 10-15 min. */
export const COMPENSATION_SHORT_DURATION_MIN = 12
export const COMPENSATION_SHORT_SPRINTS = 3
export const COMPENSATION_SHORT_BLOCKS = 2

/** RC-8.5 : douleur sur la même zone deux jours de suite : les exercices dont l'impact atteint ce niveau sont retirés. */
export const PAIN_EXCLUDE_IMPACT_AT_LEAST: 'faible' | 'moyen' | 'fort' = 'fort'

/** RC-6.4 : durée de l'aérobie léger qui remplace le conditionnement intense sous alerte. */
export const LIGHT_CONDITIONING_AEROBIC_MIN = 25
/** RC-7.2 : en mode récupération, une séance de récupération active jusqu'à ce nombre de jours après chaque match. */
export const RECOVERY_MODE_RECOVERY_DAYS = 2

// --- Records, comparaison et orientation (phase 6) ----------------------------------------------

/** RC-3.4 : 1RM estimé par Epley, `charge × (1 + reps / 30)`. */
export const EPLEY_DIVISOR = 30
/** RC-3.4 : 3RM ≈ 0,91 × 1RM (conséquence d'Epley : 1 / (1 + 3/30)). */
export const THREE_RM_TO_ONE_RM_RATIO = 0.91
/** Au-delà de ce nombre de répétitions l'estimation est peu fiable (prévenir le joueur). */
export const E1RM_IMPRECISE_ABOVE_REPS = 10
/** RC-3.2 : faiblesse si z ≤ −1, force si z ≥ +1 (z inversé pour les temps). */
export const COMPARE_Z_THRESHOLD = 1
/** Repli quand l'écart-type est inconnu : écart en % de la moyenne (choix de conception, à ajuster). */
export const COMPARE_PERCENT_THRESHOLD = 10
/** RC-3.5 : fenêtre d'analyse de la tendance masse / 10 m, en semaines. */
export const TREND_WINDOW_WEEKS = 6
/** RC-3.5 : masse en hausse de plus de 2 % sur la fenêtre. */
export const MASS_GAIN_PCT_THRESHOLD = 2
/** RC-3.5 : 10 m plus lent de plus de 0,03 s sur la fenêtre. */
export const SPRINT_10M_SLOWER_S_THRESHOLD = 0.03
/** Nombre minimal de tests au niveau du repère du niveau au-dessus pour proposer de monter de niveau. */
export const LEVEL_UP_MIN_TESTS = 2
/** Orientation « force » : séries ajoutées aux exercices principaux. */
export const ORIENT_FORCE_EXTRA_SETS = 1
/** Orientation « puissance et vitesse » : séries ajoutées aux exercices de puissance. */
export const ORIENT_POWER_EXTRA_SETS = 1
/** RC-5.5 : hypertrophie 3-4 × 8-12 (4 séries sur le secondaire, 3 sur l'accessoire), RPE 7. */
export const ORIENT_HYPERTROPHY_SETS: Record<'secondaire' | 'accessoire', number> = { secondaire: 4, accessoire: 3 }
export const ORIENT_HYPERTROPHY_REPS = 8
export const ORIENT_HYPERTROPHY_REPS_MAX = 12
export const ORIENT_HYPERTROPHY_RPE = 7

// --- Charges conseillées ------------------------------------------------------------------------

/** Fenêtre (semaines) des séances journalisées prises en compte pour le max d'un exercice. */
export const LOAD_LOG_WINDOW_WEEKS = 8
/** Au-delà de ce nombre de répétitions (réserve comprise), une série journalisée ne sert pas à estimer un max. */
export const LOAD_LOG_MAX_REPS = 12
/** Pas d'arrondi (vers le bas) d'une charge à la barre et d'un haltère. */
export const LOAD_STEP_BARBELL_KG = 2.5
export const LOAD_STEP_DUMBBELL_KG = 2
/** Charge minimale proposée à la barre (barre olympique à vide). */
export const LOAD_MIN_BARBELL_KG = 20

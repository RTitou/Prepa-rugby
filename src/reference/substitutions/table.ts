import { IMPACT_ORDER } from '../../types/reference'
import type { BodyZone, Exercise, SevereSign, SubstitutionRule } from '../../types/reference'

/*
 * Table de substitution par zone blessée (veille §8.4 et RC-8.4).
 * La veille précise qu'AUCUNE étude ne valide d'algorithme de substitution : ce sont des principes de
 * bon sens clinique et de pratique de terrain (niveau C). L'utilisateur a validé leur usage le 2026-10-01.
 * Relecture kiné recommandée : `reviewedByPhysio` reste à false jusqu'à relecture.
 *
 * Chaque règle exclut (a) les exercices qui sollicitent une des zones listées, (b) éventuellement les
 * charges axiales ou les impacts, (c) des exercices nommés. Les substituts sont des exercices de la
 * bibliothèque qui ne sollicitent aucune zone exclue (vérifié par tests/reference/integrity.test.ts).
 */

const SRC = ['veille-prepa-rugby']

const GENERIC_MESSAGE =
  'Adapte ta séance et évite les mouvements qui font mal. Si la douleur persiste, consulte un médecin ou un kiné.'

// Haut du corps sans appui des jambes, utilisable quand une zone du bas du corps est touchée.
const UPPER_BODY = ['chest-supported-row', 'lat-pulldown', 'pec-deck', 'dumbbell-bench-press']

export const SUBSTITUTION_RULES: readonly SubstitutionRule[] = [
  {
    zone: 'tete',
    label: 'Tête : commotion suspectée ou confirmée',
    suspend: true,
    excludeAll: true,
    excludeZones: [],
    excludeAxialLoad: false,
    excludeExerciseIds: [],
    excludeNotes: ['Tout exercice au-delà de l’étape du protocole validée par le médecin : pas de contact, d’effort maximal, de saut ni de sprint.'],
    substituteIds: [],
    message: 'Arrêt et avis médical. Protocole de reprise World Rugby, au moins 21 jours avant de rejouer.',
    returnToPlay: {
      minDaysBeforePlaying: 21,
      stageMinHours: 24,
      description:
        'Repos relatif physique et cognitif initial de 24 h chez l’adulte, 24 à 48 h chez l’enfant et l’adolescent. Reprise par étapes, chacune d’au moins 24 h, sans aggravation des symptômes ; les étapes de rugby exigent d’être redevenu normal. Délai minimal avant de rejouer : 21 jours (adulte comme adolescent) sans encadrement médical spécialisé.',
    },
    reviewedByPhysio: false,
    sourceIds: ['world-rugby-concussion', 'veille-prepa-rugby'],
    evidence: 'A',
  },
  {
    zone: 'cou',
    label: 'Cou',
    suspend: false,
    excludeAll: false,
    excludeZones: ['cou'],
    excludeAxialLoad: false,
    excludeExerciseIds: ['back-squat', 'shrug-dumbbell', 'neck-harness', 'scrum-push-simulated', 'contact-circuit'],
    excludeNotes: ['Charges sur la nuque', 'Haussements d’épaules lourds', 'Poussée en mêlée', 'Pont de lutte'],
    substituteIds: ['leg-press', 'seated-leg-curl', 'leg-extension', 'dead-bug', 'leg-raise'],
    message: 'Évite toute charge sur la nuque et les poussées de mêlée. Travaille le bas du corps assis ou sur machine et le gainage sans charge cervicale.',
    medicalAdvice: 'Avis médical si fourmillements ou irradiation.',
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
  {
    zone: 'epaule',
    label: 'Épaule',
    suspend: false,
    excludeAll: false,
    excludeZones: ['epaule'],
    excludeAxialLoad: false,
    excludeExerciseIds: ['bench-press', 'overhead-press', 'dips', 'power-clean', 'hang-power-clean', 'pull-up-weighted'],
    excludeNotes: ['Développé couché', 'Développé militaire', 'Dips', 'Épaulé', 'Tractions'],
    substituteIds: ['belt-squat', 'leg-press', 'safety-bar-squat', 'dead-bug', 'leg-raise', 'easy-bike'],
    message: 'Épargne l’épaule : travaille le bas du corps (squat à la ceinture, presse), le gainage et le vélo.',
    medicalAdvice: 'Avis médical si instabilité ou luxation.',
    notModeled: ['Côté sain en unilatéral : le côté blessé n’est pas modélisé en V1.'],
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
  {
    zone: 'coude-poignet-main',
    label: 'Coude, poignet, main',
    suspend: false,
    excludeAll: false,
    excludeZones: ['coude-poignet-main'],
    excludeAxialLoad: false,
    excludeExerciseIds: ['bench-press', 'power-clean', 'hang-power-clean'],
    excludeNotes: ['Prises lourdes', 'Développé couché', 'Épaulé'],
    substituteIds: ['leg-press', 'hack-squat', 'belt-squat', 'safety-bar-squat', 'leg-extension', 'seated-leg-curl', 'easy-bike', 'dead-bug'],
    message: GENERIC_MESSAGE,
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
  {
    zone: 'bas-du-dos',
    label: 'Bas du dos',
    suspend: false,
    excludeAll: false,
    excludeZones: ['bas-du-dos'],
    excludeAxialLoad: true,
    excludeImpactAtLeast: 'moyen',
    excludeExerciseIds: ['trap-bar-deadlift', 'back-squat', 'good-morning', 'romanian-deadlift'],
    excludeNotes: ['Soulevé de terre', 'Back squat', 'Good morning', 'Charges axiales', 'Impacts'],
    substituteIds: ['leg-press', 'hack-squat', 'split-squat-bodyweight', 'hip-thrust', 'glute-bridge', 'easy-bike', 'lat-pulldown', 'pec-deck'],
    message: 'Évite les charges sur le dos et les impacts. Presse, travail unilatéral au poids du corps, vélo et haut du corps assis restent possibles.',
    medicalAdvice: 'Avis médical si la douleur irradie dans la jambe.',
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
  {
    zone: 'ischios',
    label: 'Ischios (lésion)',
    suspend: false,
    excludeAll: false,
    excludeZones: ['ischios'],
    excludeAxialLoad: false,
    excludeExerciseIds: ['sprint-10m', 'sprint-fly-30m', 'nordic-curl', 'nordic-assisted', 'romanian-deadlift', 'walking-lunge'],
    excludeNotes: ['Sprints', 'Nordic', 'Soulevé de terre jambes tendues', 'Fentes amples'],
    substituteIds: [...UPPER_BODY, 'easy-bike', 'dead-bug', 'plank'],
    message: 'La reprise de la course relève du kiné.',
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
  {
    zone: 'quadriceps-adducteurs-aine',
    label: 'Quadriceps, adducteurs, aine',
    suspend: false,
    excludeAll: false,
    excludeZones: ['quadriceps-adducteurs-aine'],
    excludeAxialLoad: false,
    excludeExerciseIds: ['sprint-10m', 'sprint-fly-30m', 'change-of-direction', 'back-squat', 'jump-squat', 'box-jump'],
    excludeNotes: ['Sprints', 'Changements de direction', 'Squat profond', 'Pliométrie'],
    substituteIds: [...UPPER_BODY, 'pull-buoy-swim', 'dead-bug'],
    message: GENERIC_MESSAGE,
    notModeled: ['Côté sain en unilatéral : le côté blessé n’est pas modélisé en V1.', 'Natation : à confirmer par un avis médical ou kiné.'],
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
  {
    zone: 'genou',
    label: 'Genou',
    suspend: false,
    excludeAll: false,
    excludeZones: ['genou'],
    excludeAxialLoad: false,
    excludeExerciseIds: ['back-squat', 'bulgarian-split-squat', 'walking-lunge', 'jump-squat', 'box-jump', 'sprint-10m', 'sprint-fly-30m', 'change-of-direction'],
    excludeNotes: ['Squat profond', 'Fentes', 'Sauts', 'Sprints', 'Changements de direction'],
    substituteIds: [...UPPER_BODY, 'bench-press', 'hip-thrust', 'glute-bridge', 'bridge-march', 'arm-ergometer-easy'],
    message: 'Épargne le genou : haut du corps, pont ou hip thrust si indolore, vélo à bras.',
    medicalAdvice: 'Avis médical si gonflement, blocage ou dérobement.',
    notModeled: ['Travail de la jambe saine : le côté blessé n’est pas modélisé en V1.'],
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
  {
    zone: 'cheville-pied',
    label: 'Cheville, pied',
    suspend: false,
    excludeAll: false,
    excludeZones: ['cheville-pied'],
    excludeAxialLoad: false,
    excludeExerciseIds: ['jump-squat', 'countermovement-jump', 'box-jump', 'pogo-jumps', 'sprint-10m', 'sprint-fly-30m', 'easy-jog', 'back-squat'],
    excludeNotes: ['Sauts', 'Sprints', 'Course', 'Squat en charge debout'],
    substituteIds: ['lat-pulldown', 'pec-deck', 'chest-supported-row', 'leg-press', 'rower-upper-body', 'easy-bike', 'pull-buoy-swim'],
    message: 'Épargne la cheville : haut du corps assis, presse si indolore, rameur haut du corps, vélo selon tolérance ou natation avec pull-buoy.',
    medicalAdvice: 'Avis médical si tu es incapable de faire 4 pas.',
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
  {
    zone: 'mollet-achille',
    label: 'Mollet, tendon d’Achille',
    suspend: false,
    excludeAll: false,
    excludeZones: ['mollet-achille'],
    excludeAxialLoad: false,
    excludeExerciseIds: ['jump-squat', 'countermovement-jump', 'box-jump', 'pogo-jumps', 'sprint-10m', 'sprint-fly-30m', 'calf-raise'],
    excludeNotes: ['Sauts', 'Sprints', 'Montées sur pointes chargées'],
    substituteIds: ['lat-pulldown', 'pec-deck', 'chest-supported-row', 'bench-press', 'easy-bike'],
    message: GENERIC_MESSAGE,
    reviewedByPhysio: false,
    sourceIds: SRC,
    evidence: 'C',
  },
]

/** Signes graves : suspension totale du plan et consultation (RC-8.4). */
export const SEVERE_SIGNS: readonly SevereSign[] = [
  { id: 'perte-de-connaissance', label: 'Perte de connaissance' },
  { id: 'deformation', label: 'Déformation visible' },
  { id: 'appui-impossible', label: 'Impossibilité d’appuyer ou de marcher' },
  { id: 'symptomes-neurologiques', label: 'Symptômes neurologiques (fourmillements, engourdissement, faiblesse)' },
]

export const SEVERE_SIGNS_MESSAGE =
  'Signe grave : arrête l’entraînement et consulte un médecin avant toute reprise. Le plan est suspendu.'

const BY_ZONE = new Map(SUBSTITUTION_RULES.map((r) => [r.zone, r]))

export function getSubstitutionRule(zone: BodyZone): SubstitutionRule {
  const rule = BY_ZONE.get(zone)
  if (!rule) throw new Error(`Zone sans règle : ${zone}`)
  return rule
}

/** Vrai si l'exercice est exclu par la règle de la zone. */
export function isExerciseExcluded(rule: SubstitutionRule, exercise: Exercise): boolean {
  if (rule.excludeAll) return true
  if (rule.excludeExerciseIds.includes(exercise.id)) return true
  if (exercise.zones.some((z) => rule.excludeZones.includes(z))) return true
  if (rule.excludeAxialLoad && exercise.axialLoad) return true
  if (rule.excludeImpactAtLeast && IMPACT_ORDER[exercise.impact] >= IMPACT_ORDER[rule.excludeImpactAtLeast]) return true
  return false
}

/** Vrai si l'exercice est exclu par au moins une des zones actives. */
export function isExcludedByZones(zones: readonly BodyZone[], exercise: Exercise): boolean {
  return zones.some((z) => isExerciseExcluded(getSubstitutionRule(z), exercise))
}

/** Vrai si l'une des zones déclarées impose la suspension du plan. */
export function suspendsPlan(zones: readonly BodyZone[]): boolean {
  return zones.some((z) => getSubstitutionRule(z).suspend)
}

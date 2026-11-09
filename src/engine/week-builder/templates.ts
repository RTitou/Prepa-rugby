import type { ExerciseCategory } from '../../types/reference'
import type { BlockKind, SessionSlot } from '../../types/plan'
import type { Scheme, SchemeKind } from '../config'
import type { StartingLevel } from '../progression/level'

/*
 * Gabarits de séance : pour chaque bloc, une liste ordonnée d'exercices candidats (ids de la bibliothèque).
 * Le moteur prend le premier candidat disponible (non exclu, non déjà utilisé) : choix stable et testable.
 * Les blocs marqués `rotate` alternent entre les candidats d'une semaine à l'autre (numéro de semaine ISO),
 * sans aléatoire. Ce sont des choix de conception à faire relire par un préparateur physique.
 */

export interface BlockSpec {
  block: BlockKind
  scheme: SchemeKind
  pool: readonly string[]
  rotate?: boolean
  /** Bloc réservé aux niveaux qui satisfont la condition. */
  when?: (level: StartingLevel) => boolean
}

const differentiated = (l: StartingLevel) => l.differentiated

const LOWER_PRINCIPAL = ['back-squat', 'front-squat', 'safety-bar-squat', 'belt-squat', 'leg-press']
const HINGE = ['romanian-deadlift', 'trap-bar-deadlift', 'hip-thrust', 'glute-bridge']
const UNILATERAL = ['bulgarian-split-squat', 'walking-lunge', 'step-up', 'split-squat-bodyweight']
const PUSH_PRINCIPAL = ['bench-press', 'dumbbell-bench-press', 'push-up']
const PULL = ['bent-over-row', 'chest-supported-row', 'lat-pulldown']

export function templateFor(slot: SessionSlot, variant: number): BlockSpec[] {
  switch (slot) {
    case 'bas-force':
      return [
        { block: 'puissance', scheme: 'puissance', pool: ['jump-squat', 'box-jump', 'countermovement-jump'], rotate: true, when: differentiated },
        { block: 'force', scheme: 'principal', pool: LOWER_PRINCIPAL },
        { block: 'force', scheme: 'secondaire', pool: HINGE, rotate: true },
        { block: 'force', scheme: 'secondaire', pool: UNILATERAL, rotate: true },
        { block: 'accessoire', scheme: 'accessoire', pool: ['seated-leg-curl', 'single-leg-rdl', 'calf-raise'], rotate: true },
        { block: 'tronc', scheme: 'tronc', pool: ['pallof-press', 'plank', 'side-plank'], rotate: true },
      ]
    case 'haut':
      return [
        { block: 'puissance', scheme: 'puissance', pool: ['med-ball-chest-throw', 'plyo-push-up', 'med-ball-slam'], rotate: true, when: differentiated },
        { block: 'force', scheme: 'principal', pool: PUSH_PRINCIPAL },
        { block: 'force', scheme: 'secondaire', pool: PULL, rotate: true },
        { block: 'force', scheme: 'secondaire', pool: ['overhead-press', 'dips', 'dumbbell-bench-press'], rotate: true },
        { block: 'accessoire', scheme: 'accessoire', pool: ['face-pull', 'reverse-pec-deck', 'lateral-raise'], rotate: true },
        { block: 'tronc', scheme: 'tronc', pool: ['dead-bug', 'side-plank', 'bird-dog'], rotate: true },
      ]
    case 'puissance':
      return [
        { block: 'puissance', scheme: 'puissance', pool: ['hang-power-clean', 'power-clean', 'kettlebell-swing'] },
        { block: 'puissance', scheme: 'puissance', pool: ['box-jump', 'jump-squat', 'broad-jump'], rotate: true },
        { block: 'puissance', scheme: 'puissance', pool: ['med-ball-rotational-throw', 'med-ball-slam'], rotate: true },
        { block: 'force', scheme: 'secondaire', pool: ['trap-bar-deadlift', 'front-squat', 'leg-press'] },
        { block: 'force', scheme: 'secondaire', pool: ['overhead-press', 'pull-up-weighted', 'lat-pulldown'], rotate: true },
        { block: 'tronc', scheme: 'tronc', pool: ['pallof-press', 'cable-woodchop', 'plank'], rotate: true },
      ]
    case 'corps-entier':
      // Deux variantes alternées (A/B) pour apprendre les schémas de base ou répartir le volume modéré.
      return variant % 2 === 0
        ? [
            { block: 'force', scheme: 'principal', pool: ['back-squat', 'front-squat', 'belt-squat', 'leg-press'] },
            { block: 'force', scheme: 'principal', pool: ['dumbbell-bench-press', 'bench-press', 'push-up'] },
            { block: 'force', scheme: 'secondaire', pool: ['chest-supported-row', 'bent-over-row', 'lat-pulldown'] },
            { block: 'accessoire', scheme: 'accessoire', pool: ['glute-bridge', 'hip-thrust', 'seated-leg-curl'] },
            { block: 'tronc', scheme: 'tronc', pool: ['plank', 'dead-bug'] },
          ]
        : [
            { block: 'force', scheme: 'principal', pool: ['trap-bar-deadlift', 'romanian-deadlift', 'leg-press'] },
            { block: 'force', scheme: 'principal', pool: ['overhead-press', 'dumbbell-bench-press', 'push-up'] },
            { block: 'force', scheme: 'secondaire', pool: ['lat-pulldown', 'chest-supported-row', 'bent-over-row'] },
            { block: 'accessoire', scheme: 'accessoire', pool: ['split-squat-bodyweight', 'step-up', 'walking-lunge'] },
            { block: 'tronc', scheme: 'tronc', pool: ['dead-bug', 'side-plank', 'plank'] },
          ]
    default:
      return []
  }
}

// ---------------------------------------------------------------------------------------------
// Accents de poste (positionEmphasis) : blocs ajoutés selon la catégorie et le poids du sous-groupe.
// ---------------------------------------------------------------------------------------------

export interface AccentRule {
  label: string
  slots: readonly SessionSlot[]
  block: BlockKind
  /** Candidats ; le niveau peut en restreindre la liste. */
  pool: (level: StartingLevel) => readonly string[]
  scheme: Scheme | SchemeKind
  /** Si faux, seule la priorité « prioritaire » ajoute le bloc. */
  includeRenforce: boolean
  /** Insère le bloc en tête de séance (après la vitesse). */
  first?: boolean
}

export const ACCENT_RULES: Partial<Record<ExerciseCategory, AccentRule>> = {
  cou: {
    label: 'Cou',
    slots: ['haut', 'corps-entier'],
    block: 'cou',
    pool: () => ['neck-band', 'neck-isometric', 'neck-harness'],
    scheme: 'cou',
    includeRenforce: true,
  },
  'force-haut': {
    label: 'Force du haut du corps',
    slots: ['haut', 'corps-entier'],
    block: 'force',
    pool: (level) => (level.fullBody ? ['lat-pulldown'] : ['pull-up-weighted', 'dips', 'overhead-press', 'lat-pulldown']),
    scheme: 'secondaire',
    includeRenforce: false,
  },
  'force-bas': {
    label: 'Force du bas du corps',
    slots: ['bas-force', 'corps-entier'],
    block: 'force',
    pool: () => ['leg-press', 'hack-squat', 'hip-thrust', 'bulgarian-split-squat'],
    scheme: 'secondaire',
    includeRenforce: false,
  },
  puissance: {
    label: 'Puissance',
    slots: ['bas-force', 'puissance', 'corps-entier'],
    block: 'puissance',
    pool: () => ['countermovement-jump', 'box-jump', 'jump-squat', 'broad-jump'],
    scheme: 'puissance',
    includeRenforce: false,
    first: true,
  },
  tronc: {
    label: 'Tronc',
    slots: ['bas-force', 'haut', 'corps-entier', 'puissance'],
    block: 'tronc',
    pool: () => ['pallof-press', 'ab-wheel', 'cable-woodchop', 'side-plank'],
    scheme: 'tronc',
    includeRenforce: false,
  },
  'ischios-excentrique': {
    label: 'Ischios en excentrique',
    slots: ['bas-force', 'corps-entier'],
    block: 'accessoire',
    pool: (level) => (level.fullBody ? ['slider-leg-curl'] : ['nordic-assisted', 'slider-leg-curl', 'single-leg-rdl']),
    scheme: { sets: 3, reps: 5, rpe: 7 },
    includeRenforce: true,
  },
}

/** Exercices de récupération active (MD+1). */
export const RECOVERY_AEROBIC_POOL = ['easy-bike', 'brisk-walk', 'easy-rower', 'easy-skierg']
export const RECOVERY_MOBILITY = ['hip-mobility', 'thoracic-mobility']

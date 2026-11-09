import type { WarmupProgramme, WarmupStep } from '../../types/reference'

/*
 * Échauffement de prévention inspiré d'Activate (World Rugby / RFU).
 *
 * Source : Hislop et al. 2017 (essai randomisé, 40 écoles, 3 188 joueurs de 14 à 18 ans) : le programme
 * associe équilibre, renforcement global, pliométrie, réceptions et changements d'appui contrôlés, et
 * renforcement du cou. Fait au moins 3 fois par semaine : blessures en match RR 0,28 et commotions
 * RR 0,41 (veille §8.2). L'utilisateur a validé l'usage du contenu Activate de World Rugby (2026-10-01).
 *
 * Le texte ci-dessous est une reformulation en français de ces composantes, avec des exercices de la
 * bibliothèque. Il ne reproduit pas mot à mot le programme officiel : le détail des exercices et des
 * progressions officiels doit être rapproché du site World Rugby (Activate) avant diffusion large.
 * Les durées sont une estimation de conception (≈ 15-20 min en version complète), pas une donnée de la veille.
 * Relecture kiné recommandée.
 */

const SOURCES = ['hislop-2017', 'world-rugby-activate']

const FULL_STEPS: WarmupStep[] = [
  {
    id: 'general',
    order: 1,
    component: 'general',
    title: 'Montée en température',
    instructions: 'Trottine doucement, ajoute des pas chassés, de la marche arrière et quelques accélérations courtes. Le cœur monte progressivement.',
    durationMin: 3,
    exerciseIds: ['easy-jog'],
  },
  {
    id: 'mobilite',
    order: 2,
    component: 'mobilite',
    title: 'Mobilité dynamique',
    instructions: 'Hanches, chevilles et épaules en mouvements amples et lents, sans douleur.',
    durationMin: 2,
    exerciseIds: ['hip-mobility', 'ankle-mobility', 'shoulder-mobility'],
  },
  {
    id: 'equilibre',
    order: 3,
    component: 'equilibre',
    title: 'Équilibre',
    instructions: 'Équilibre sur une jambe, genou souple et bassin stable, puis sur l’autre. Complique avec des mouvements de bras.',
    durationMin: 2,
    exerciseIds: ['single-leg-balance'],
  },
  {
    id: 'renforcement',
    order: 4,
    component: 'renforcement',
    title: 'Renforcement au poids du corps',
    instructions: 'Squats, fentes, pont fessier et gainage, mouvements lents et contrôlés, genoux dans l’axe des pieds.',
    durationMin: 4,
    exerciseIds: ['bodyweight-squat-control', 'lunge-control', 'glute-bridge', 'plank', 'side-plank'],
  },
  {
    id: 'cou',
    order: 5,
    component: 'cou',
    title: 'Renforcement du cou',
    instructions: 'Isométrique dans les quatre directions, quelques secondes par direction, sans à-coup. Composante associée à la baisse des commotions.',
    durationMin: 2,
    exerciseIds: ['neck-isometric', 'neck-band'],
  },
  {
    id: 'pliometrie',
    order: 6,
    component: 'pliometrie',
    title: 'Pliométrie légère',
    instructions: 'Petits sauts et rebonds, qualité avant intensité, réceptions silencieuses.',
    durationMin: 2,
    exerciseIds: ['pogo-jumps', 'countermovement-jump'],
  },
  {
    id: 'reception-appuis',
    order: 7,
    component: 'reception-appuis',
    title: 'Réceptions et changements d’appui contrôlés',
    instructions: 'Réceptions amorties sur deux puis un pied, pas latéraux avec freinage, genou stable au-dessus du pied.',
    durationMin: 2,
    exerciseIds: ['controlled-landing', 'controlled-side-step'],
  },
  {
    id: 'montee-intensite',
    order: 8,
    component: 'montee-intensite',
    title: 'Montée en intensité',
    instructions: 'Accélérations progressives sur 15 à 20 m, de plus en plus vite, sans aller au maximum.',
    durationMin: 2,
    exerciseIds: ['running-drills'],
  },
]

const SHORT_STEPS: WarmupStep[] = [
  {
    id: 'general',
    order: 1,
    component: 'general',
    title: 'Montée en température',
    instructions: 'Trottine, pas chassés et marche arrière, quelques accélérations courtes.',
    durationMin: 2,
    exerciseIds: ['easy-jog'],
  },
  {
    id: 'equilibre-renforcement',
    order: 2,
    component: 'renforcement',
    title: 'Équilibre et renforcement',
    instructions: 'Équilibre sur une jambe, squats contrôlés et pont fessier.',
    durationMin: 3,
    exerciseIds: ['single-leg-balance', 'bodyweight-squat-control', 'glute-bridge'],
  },
  {
    id: 'cou',
    order: 3,
    component: 'cou',
    title: 'Renforcement du cou',
    instructions: 'Isométrique du cou dans les quatre directions, sans à-coup.',
    durationMin: 1,
    exerciseIds: ['neck-isometric'],
  },
  {
    id: 'reception-appuis',
    order: 4,
    component: 'reception-appuis',
    title: 'Réceptions et appuis contrôlés',
    instructions: 'Réceptions amorties et pas latéraux avec freinage.',
    durationMin: 2,
    exerciseIds: ['controlled-landing', 'controlled-side-step'],
  },
]

export const ACTIVATE_FULL: WarmupProgramme = {
  id: 'complet',
  label: 'Échauffement de prévention (version complète)',
  steps: FULL_STEPS,
  durationsAreEstimates: true,
  reviewedByPhysio: false,
  sourceIds: SOURCES,
  note: 'Inspiré d’Activate (World Rugby), composantes de Hislop 2017. Relecture kiné recommandée.',
}

export const ACTIVATE_SHORT: WarmupProgramme = {
  id: 'court',
  label: 'Échauffement de prévention (version courte)',
  steps: SHORT_STEPS,
  durationsAreEstimates: true,
  reviewedByPhysio: false,
  sourceIds: SOURCES,
  note: 'Version courte, mêmes composantes principales (dont le cou). Relecture kiné recommandée.',
}

export const ACTIVATE_PROGRAMMES: readonly WarmupProgramme[] = [ACTIVATE_FULL, ACTIVATE_SHORT]

export function totalDurationMin(programme: WarmupProgramme): number {
  return programme.steps.reduce((sum, step) => sum + step.durationMin, 0)
}

export function getWarmup(version: 'complet' | 'court'): WarmupProgramme {
  return version === 'complet' ? ACTIVATE_FULL : ACTIVATE_SHORT
}

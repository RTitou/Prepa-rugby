import type { AtpBlockDef, AtpItem } from './types'

/*
 * Field work du vendredi (J5) de la méthode ATP, semaines 1 à 9 (sections 3.5 et 5.2-5.4 de l'analyse, reformulées).
 * Progression : accélération linéaire (S2-3), puis freinage et réaccélération avec angles (S4-6), puis appuis toniques et
 * virages serrés (S7-8). S1 : tests ; S9 : re-tests. Différences avants / arrières sur la puissance et le triangle.
 */

const r = (id: string, sets: number, reps: number, extra: Partial<AtpItem> = {}): AtpItem => ({ id, sets, reps, rpe: null, ...extra })

function warmup(week: number): AtpBlockDef {
  let items: AtpItem[]
  if (week === 1) {
    items = [
      r('athletic-lunge', 3, 8, { perSide: true }),
      r('dynamic-side-plank', 3, 30, { unit: 's', perSide: true }),
      r('in-out-lateral-steps', 3, 5, { perSide: true }),
      r('easy-jog', 3, 1, { unit: 'min' }),
    ]
  } else if (week <= 3) {
    items = [
      r('pogo-jumps', 3, 30, { unit: 's', perSide: true, note: 'Pogo en fente.' }),
      r('dynamic-side-plank', 3, 30, { unit: 's', perSide: true }),
      r('in-out-lateral-steps', 3, 5, { perSide: true }),
      r('accel-decel', 3, 5, { note: 'Accélérations-décélérations progressives.' }),
    ]
  } else if (week <= 6) {
    items = [
      r('lateral-pogo', 3, 20),
      r('glute-bridge-walkout', 3, 6, { note: 'Allers-retours.' }),
      r('lateral-sprint', 3, 4, { note: '5 m d’accélération-freinage, puis 5 m de sprint latéral à droite et 5 m à gauche.' }),
    ]
  } else {
    items = [
      r('single-leg-hop', 3, 10, { perSide: true }),
      r('ballistic-kick-rdl', 3, 5, { perSide: true }),
      r('zigzag-footwork', 3, 1, { note: 'Un aller-retour de 4 m.' }),
      r('easy-jog', 3, 1, { unit: 'min' }),
    ]
  }
  return { letter: 'A', kind: 'echauffement', title: 'Échauffement', items }
}

function tests(): AtpBlockDef[] {
  return [
    { letter: 'B', kind: 'test', title: 'Test broad jump', restSec: [90, 120], tests: ['broad-jump'], items: [{ id: 'broad-jump-test', sets: 5, reps: 1, rpe: 10 }] },
    {
      letter: 'C',
      kind: 'test',
      title: 'Test saut latéral sur une jambe',
      restSec: [90, 120],
      tests: ['saut-lateral-gauche', 'saut-lateral-droite'],
      items: [{ id: 'lateral-hop-test', sets: 5, reps: 1, perSide: true, rpe: 10 }],
    },
    { letter: 'D', kind: 'test', title: 'T-test', tests: ['t-test'], items: [{ id: 't-test-drill', sets: 3, reps: 1, rpe: 10 }] },
  ]
}

const FINISHER_NOTE: Record<'s2' | 's4' | 's7', string> = {
  s2: '3/3 fentes sautées, 5/5 cossack + soulevé roumain + montée de genou, 5 à 8 hip thrusts en marchant.',
  s4: '4 pogos latéraux + 1 pas latéral par côté, 3/3 soulevés roumains sur une jambe + triple montée de genou, 30 s de planche chinoise (en semaine 6 : sur une jambe, 20 s par côté).',
  s7: '3/3 sauts groupés + pas latéral, 5/5 cossack + montée de genou, 40 s de climbers (tenus puis dynamiques).',
}

function finisher(note: string): AtpBlockDef {
  return {
    letter: 'E',
    kind: 'finisher',
    title: 'Finisher',
    optional: true,
    restSec: [60, 180],
    items: [{ id: 'atp-field-finisher', sets: 3, reps: 1, repsMax: 5, rpe: 7, note }],
  }
}

export function fieldBlocks(week: number): AtpBlockDef[] {
  if (week === 1) {
    return [
      warmup(1),
      ...tests(),
      { letter: 'E', kind: 'conditionnement', title: 'Circuit 20 s / 10 s', restSec: [120, 120], items: [{ id: 'field-circuit-20-10', sets: 9, reps: 1, rpe: 9, note: '9 tours, intensité maximale.' }] },
    ]
  }
  if (week === 9) {
    return [warmup(9), ...tests(), finisher(FINISHER_NOTE.s7)]
  }
  if (week <= 3) {
    return [
      warmup(week),
      {
        letter: 'B',
        kind: 'puissance',
        title: 'Puissance',
        restSec: [60, 120],
        items: [
          { id: 'tuck-lateral-broad-jump', sets: 5, reps: 1, perSide: true, rpe: 8, line: 'arrieres' },
          { id: 'vertical-double-broad-jump', sets: 5, reps: 2, rpe: 8, line: 'avants' },
          { id: 'proprioception-3d', sets: 5, reps: 30, unit: 's', perSide: true, rpe: null },
        ],
      },
      {
        letter: 'C',
        kind: 'terrain',
        title: 'Changements de direction',
        restSec: [90, 90],
        items: [{ id: 'triangle-cod', sets: 5, reps: 1, rpe: 9 }],
      },
      { letter: 'D', kind: 'vitesse', title: 'Sprint linéaire', restSec: [60, 180], items: [{ id: 'linear-sprint-ladder', sets: 3, reps: 1, rpe: 9, note: 'Trois blocs : 5 × 15 m, 4 × 20 m, 3 × 25 m.' }] },
      finisher(FINISHER_NOTE.s2),
    ]
  }
  if (week <= 6) {
    return [
      warmup(week),
      {
        letter: 'B',
        kind: 'puissance',
        title: 'Puissance',
        restSec: [60, 120],
        items: [
          { id: 'lateral-steps-accel', sets: 5, reps: 1, perSide: true, rpe: 8, line: 'arrieres' },
          { id: 'tackle-bag-complex', sets: 5, reps: 4, rpe: 8, line: 'avants' },
          { id: 'proprioception-3d', sets: 5, reps: 30, unit: 's', perSide: true, rpe: null, note: 'Avec un ballon.' },
        ],
      },
      { letter: 'C', kind: 'terrain', title: 'Parcours explosivité', restSec: [90, 90], items: [{ id: 'cod-course', sets: 5, reps: 1, perSide: true, rpe: 9 }] },
      {
        letter: 'D',
        kind: 'vitesse',
        title: 'Sprint multidirectionnel',
        restSec: [30, 60],
        items: [{ id: 'multidirectional-sprint-45-90', sets: week === 6 ? 8 : 5, reps: 1, perSide: true, rpe: 9 }],
      },
      finisher(FINISHER_NOTE.s4),
    ]
  }
  return [
    warmup(week),
    {
      letter: 'B',
      kind: 'puissance',
      title: 'Puissance et appuis',
      restSec: [60, 120],
      items: [
        { id: 'lateral-step-sprint', sets: 6, reps: 1, rpe: 8, line: 'arrieres' },
        { id: 'short-accel-decel', sets: 6, reps: 3, rpe: 8, line: 'avants' },
      ],
    },
    { letter: 'C', kind: 'vitesse', title: 'Sprint avec virages à 90°', restSec: [30, 180], items: [{ id: 'multidirectional-sprint-90', sets: 6, reps: 1, perSide: true, rpe: 9 }] },
    finisher(FINISHER_NOTE.s7),
  ]
}

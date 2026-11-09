import { conditioningBlocks } from './conditioning'
import { fieldBlocks } from './field'
import type { AtpBlockDef, AtpDay, AtpItem } from './types'

/*
 * Contenu des séances de la semaine type ATP par bloc de 3 semaines (S1-3, S4-6, S7-9), source `atp-beast-off-season`
 * (sections 3.1 à 3.7 de l'analyse). Méthode reformulée : aucun texte du programme n'est recopié, pas de lien vidéo,
 * rien sur les compléments. Les incohérences relevées dans l'analyse sont corrigées (soulevé de terre sans consigne de
 * pectoraux, schéma 5-3-1 en S6, AMRAP de 4 min en S5).
 * Le bloc C des séances de salle porte `strengthLift` : son schéma vient de strength.ts.
 */

/** Semaine type : lundi lower, mardi upper, mercredi conditioning, jeudi accessoire (facultatif), vendredi terrain, samedi full body, dimanche récupération (facultative). */
export const ATP_WEEK: readonly AtpDay[] = ['lower', 'upper', 'conditioning', 'accessoire', 'terrain', 'full', 'recup']

export const ATP_OPTIONAL_DAYS: ReadonlySet<AtpDay> = new Set(['accessoire', 'recup'])

export const ATP_DAY_TITLES: Record<AtpDay, { title: string; focus: string }> = {
  lower: { title: 'Lower body', focus: 'force du bas du corps et pliométrie' },
  upper: { title: 'Upper body', focus: 'force du haut du corps et push press' },
  conditioning: { title: 'Conditioning', focus: 'répéter les efforts intenses comme en match' },
  accessoire: { title: 'Accessoire + vélo', focus: 'petits muscles, prévention, faible intensité' },
  terrain: { title: 'Field work', focus: 'puissance, accélération, changements de direction' },
  full: { title: 'Full body', focus: 'haut du corps et chaîne postérieure' },
  recup: { title: 'Récupération', focus: 'zone 2 ou repos' },
}

/** Bloc de 3 semaines : 1 (S1-3), 2 (S4-6), 3 (S7-9). */
export function weekBlock(week: number): 1 | 2 | 3 {
  return week <= 3 ? 1 : week <= 6 ? 2 : 3
}

const A = (items: AtpItem[], title = 'Échauffement'): AtpBlockDef => ({
  letter: 'A',
  kind: 'echauffement',
  title,
  items: items.map((i) => ({ rpe: null, ...i })),
})

// ---------------------------------------------------------------------------------------------
// Lower body (J1)
// ---------------------------------------------------------------------------------------------

const LOWER_FINISHER: Record<number, { note: string; homme: string; femme: string }> = {
  1: { note: '5 × (90 s d’effort / 90 s de repos) : 18 calories au rameur (ou 1 min de burpees), puis swings russes en max de répétitions. Score : répétitions.', homme: '2 × 20 kg', femme: '2 × 12 kg' },
  2: { note: '5 × 90 s / 90 s : 8 burpees, 16 wall balls, puis power cleans en max de répétitions.', homme: 'barre 40 kg, wall ball 9 kg', femme: 'barre 30 kg, wall ball 6 kg' },
  3: { note: '5 × 90 s / 90 s : 2 × (5 thrusters + 5 burpees par-dessus la barre), puis max de calories sur un ergo (ou corde à sauter).', homme: '40 kg', femme: '30 kg' },
  4: { note: '5 × 90 s / 90 s : 12 soulevés, 9 hang cleans et 6 push press aux haltères, puis max d’un exercice strongman (sac, pneu, farmer carry) ou de cardio.', homme: '2 × 20 kg', femme: '2 × 15 kg' },
  5: { note: '3 à 5 tours chronométrés : 5/5 fentes barre dos, 10 burpees, 15 calories sur un ergo (ou 1 min de cardio). Score : temps.', homme: '60 kg', femme: '40 kg' },
  6: { note: '4 rounds : 1 min (10 burpees puis max de goblet squats), 1 min (10 burpees puis max de tirages hauts sumo), 2 min de repos. Score : répétitions.', homme: '24 kg', femme: '16 kg' },
  7: { note: 'Pour le temps, en 3 parties : 50 thrusters, 2 min de repos, 50 power snatchs, 2 min de repos, 50 burpees.', homme: '30 kg', femme: '20 kg' },
  8: { note: 'Pour le temps : 21-15-9-6 fentes marchées avec 2 haltères + snatchs à 1 haltère.', homme: '2 × 20 kg', femme: '2 × 12 kg' },
  9: { note: '10 rounds pour le temps : 10 tirages hauts sumo, 10 pompes, 10 air squats.', homme: '24 kg', femme: '16 kg' },
}

function lowerBlocks(week: number): AtpBlockDef[] {
  const b = weekBlock(week)
  const f = LOWER_FINISHER[week]!
  const finisher: AtpBlockDef = {
    letter: 'F',
    kind: 'finisher',
    title: 'Finisher crosstraining',
    optional: true,
    restSec: [90, 120],
    items: [{ id: 'atp-gym-finisher', sets: 1, reps: 1, rpe: 8, note: f.note, noteBySex: { homme: `Charges : ${f.homme}.`, femme: `Charges : ${f.femme}.` } }],
  }
  const warm =
    b === 1
      ? A([
          { id: 'lower-mobility-flow', sets: 1, reps: 4, unit: 'min' },
          { id: 'partner-proprioception', sets: 3, reps: 30, unit: 's', perSide: true },
          { id: 'butterfly-hip', sets: 3, reps: 12 },
          { id: 'hip-thrust', sets: 3, reps: 8, rpe: 6, note: 'Pause de 5 s en haut.' },
        ])
      : b === 2
        ? A([
            { id: 'lower-mobility-flow', sets: 1, reps: 4, unit: 'min' },
            { id: 'adductor-stretch-rotation', sets: 3, reps: 10, perSide: true, note: 'Rotation externe puis interne.' },
            { id: 'cossack-squat', sets: 3, reps: 5, perSide: true, note: 'Avec un crab walk.' },
            { id: 'zombie-squat', sets: 3, reps: 5 },
          ])
        : A([
            { id: 'lower-mobility-flow', sets: 1, reps: 4, unit: 'min' },
            { id: 'hip-rotation-band', sets: 3, reps: 10, perSide: true, note: 'Rotation externe debout avec mini-band, puis interne assis.' },
            { id: 'overhead-squat-mobility', sets: 3, reps: 10 },
          ])
  const power: AtpBlockDef =
    b === 1
      ? { letter: 'B', kind: 'puissance', title: 'Puissance', restSec: [90, 120], items: [{ id: 'drop-lunge-jump', sets: 3, reps: 3, perSide: true, rpe: 8, note: 'Saute le plus haut possible, gainé et aligné. 4 séries si tu as le temps.' }] }
      : b === 2
        ? {
            letter: 'B',
            kind: 'puissance',
            title: 'Puissance',
            restSec: [90, 120],
            items: [
              { id: 'drop-lunge-split-jump', sets: 4, reps: 1, perSide: true, rpe: 8, line: 'avants' },
              { id: 'drop-jump-broad-jump', sets: 4, reps: 1, perSide: true, rpe: 8, line: 'arrieres' },
            ],
          }
        : {
            letter: 'B',
            kind: 'puissance',
            title: 'Puissance',
            restSec: [90, 120],
            items: [
              { id: 'loaded-stato-dynamic-lunge', sets: 4, reps: 3, perSide: true, rpe: 8, line: 'avants', note: 'Pause marquée, remontée explosive.' },
              { id: 'banded-lateral-bound', sets: 4, reps: 3, perSide: true, rpe: 8, line: 'arrieres' },
            ],
          }
  const strength: AtpBlockDef = { letter: 'C', kind: 'force', title: 'Force · back squat', strengthLift: 'squat', items: [] }
  const renfo: AtpBlockDef[] =
    b === 1
      ? [
          {
            letter: 'D',
            kind: 'force',
            title: 'Renforcement',
            restSec: [60, 120],
            items: [
              { id: 'atg-lunge', sets: 4, reps: 5, perSide: true, rpe: 8, note: 'Le plus lourd possible, plus que la semaine d’avant.' },
              { id: 'unilateral-oblique', sets: 4, reps: 8, perSide: true, rpe: 7 },
            ],
          },
          {
            letter: 'E',
            kind: 'force',
            title: 'Renforcement',
            restSec: [60, 120],
            items: [
              { id: 'romanian-deadlift', sets: 4, reps: week === 3 ? 6 : 10, rpe: 8, note: week === 3 ? 'Plus lourd, jambes tendues.' : 'Avec élastique si possible.' },
              { id: 'banded-alternating-row', sets: 4, reps: 8, perSide: true, rpe: 7 },
            ],
          },
        ]
      : b === 2
        ? [
            {
              letter: 'D',
              kind: 'force',
              title: 'Renforcement',
              restSec: [60, 120],
              items: [
                { id: 'back-rack-lunge', sets: 4, reps: 5, perSide: true, rpe: 8 },
                { id: 'superman-hold', sets: 4, reps: 30, unit: 's', rpe: 7 },
              ],
            },
            {
              letter: 'E',
              kind: 'force',
              title: 'Renforcement',
              restSec: [60, 120],
              items: [
                { id: 'kettlebell-swing', sets: 4, reps: 8, rpe: 8, note: 'Swing russe stato-dynamique, hanches explosives.' },
                { id: 'swissball-stir', sets: 4, reps: 30, unit: 's', rpe: 7 },
              ],
            },
          ]
        : [
            {
              letter: 'D',
              kind: 'force',
              title: 'Renforcement',
              restSec: [60, 120],
              items: [
                { id: 'bulgarian-split-squat', sets: 4, reps: 5, perSide: true, rpe: 8, note: 'En goblet, lourd.' },
                { id: 'single-leg-rdl', sets: 4, reps: 10, perSide: true, rpe: 7 },
                { id: 'get-up', sets: 4, reps: 20, rpe: 7 },
              ],
            },
          ]
  return [warm, power, strength, ...renfo, finisher]
}

// ---------------------------------------------------------------------------------------------
// Upper body (J2)
// ---------------------------------------------------------------------------------------------

function upperBlocks(week: number): AtpBlockDef[] {
  const b = weekBlock(week)
  const warm =
    b === 1
      ? A([
          { id: 'upper-self-massage', sets: 1, reps: 4, unit: 'min' },
          { id: 'bench-warmup-grips', sets: 3, reps: 12, rpe: 5 },
          { id: 'step-push-up', sets: 3, reps: 5 },
          { id: 'kb-filly-walk', sets: 3, reps: 10, perSide: true, note: '10 m par côté.' },
        ])
      : b === 2
        ? A([
            { id: 'upper-self-massage', sets: 1, reps: 4, unit: 'min' },
            { id: 'iso-t', sets: 3, reps: 25, unit: 's' },
            { id: 'kb-curl-front-raise', sets: 3, reps: 8 },
            { id: 'overhead-band-lateral-walk', sets: 3, reps: 8, perSide: true },
          ])
        : A([
            { id: 'upper-self-massage', sets: 1, reps: 4, unit: 'min' },
            { id: 'band-rotator-iso', sets: 3, reps: 30, unit: 's' },
            { id: 'push-up-tripod', sets: 3, reps: 5, perSide: true },
            { id: 'kb-bottom-up-press', sets: 3, reps: 8, perSide: true },
          ])
  const pushPress = { id: 'push-press', sets: 4, reps: b === 1 ? 4 : b === 2 ? 3 : 1, rpe: 8, note: 'Le plus lourd possible en te servant des jambes, plus que la semaine d’avant.' }
  const power: AtpBlockDef = {
    letter: 'B',
    kind: 'puissance',
    title: 'Puissance · push press',
    restSec: [60, 120],
    items:
      b === 1
        ? [pushPress, { id: 'iso-lunge-rotation', sets: 4, reps: 8, perSide: true, rpe: 7 }]
        : b === 2
          ? [pushPress, { id: 'russian-twist-unilateral', sets: 4, reps: 40, unit: 's', rpe: 7 }]
          : [pushPress, { id: 'quadruped-band-rotation', sets: 4, reps: 5, perSide: true, rpe: 7 }],
  }
  const strength: AtpBlockDef = {
    letter: 'C',
    kind: 'force',
    title: 'Force · développé couché',
    strengthLift: 'developpe-couche',
    items: week === 2 || week === 3 ? [{ id: 'pallof-press', sets: 5, reps: 20, unit: 's', perSide: true, rpe: 7, note: 'Pallof isométrique sur une jambe, entre les séries de développé.' }] : [],
  }
  let renfo: AtpBlockDef[]
  if (week <= 2) {
    renfo = [
      { letter: 'D', kind: 'force', title: 'Renforcement', restSec: [60, 120], items: [{ id: 'quadruped-row', sets: 4, reps: 8, perSide: true, rpe: 8 }, { id: 'single-arm-bench-one-foot', sets: 4, reps: 8, perSide: true, rpe: 8 }] },
      { letter: 'E', kind: 'force', title: 'Renforcement', restSec: [60, 120], items: [{ id: 'curl-javelin-press', sets: 4, reps: 6, perSide: true, rpe: 7 }, { id: 'rotational-one-arm-row', sets: 4, reps: 6, perSide: true, rpe: 7 }] },
    ]
  } else if (week === 3) {
    renfo = [
      { letter: 'D', kind: 'force', title: 'Renforcement', restSec: [60, 120], items: [{ id: 'incline-dumbbell-press', sets: 4, reps: 8, rpe: 8 }] },
      { letter: 'E', kind: 'force', title: 'Renforcement', restSec: [60, 120], items: [{ id: 'quadruped-row', sets: 4, reps: 8, perSide: true, rpe: 8 }, { id: 'curl-javelin-press', sets: 4, reps: 6, perSide: true, rpe: 7 }] },
    ]
  } else if (week <= 6) {
    renfo = [
      {
        letter: 'D',
        kind: 'force',
        title: 'Renforcement',
        restSec: [60, 120],
        items: [
          { id: 'quadruped-row-drop-catch', sets: 4, reps: 8, perSide: true, rpe: 8 },
          { id: 'upright-row', sets: 4, reps: 12, rpe: 7 },
          { id: 'biceps-curl', sets: 4, reps: 12, rpe: 7 },
          { id: 'band-torso-rotation', sets: 4, reps: 8, perSide: true, rpe: 7 },
        ],
      },
      week <= 5
        ? { letter: 'E', kind: 'accessoire', title: 'Finisher', restSec: [60, 120], items: [{ id: 'incline-fly', sets: 3, reps: 10, rpe: 7 }, { id: 'cuban-press', sets: 3, reps: 10, rpe: 6 }] }
        : { letter: 'E', kind: 'accessoire', title: 'Finisher', restSec: [60, 120], items: [{ id: 'kneeling-cross-fly', sets: 3, reps: 8, perSide: true, rpe: 7 }, { id: 'hammer-curl', sets: 3, reps: 12, rpe: 7 }] },
    ]
  } else if (week <= 8) {
    renfo = [
      { letter: 'D', kind: 'force', title: 'Renforcement', restSec: [90, 90], items: [{ id: 'incline-dumbbell-press', sets: 5, reps: 15, rpe: 9, note: 'Pyramide 15-12-9-12-15, chaque palier le plus lourd possible. 1 min 30 de repos, à respecter.' }] },
      { letter: 'E', kind: 'accessoire', title: 'Finisher', restSec: [60, 120], items: [{ id: 'kneeling-cross-fly', sets: 3, reps: 8, perSide: true, rpe: 7 }, { id: 'upright-row', sets: 3, reps: 12, rpe: 7 }, { id: 'biceps-curl', sets: 3, reps: 12, rpe: 7 }] },
    ]
  } else {
    renfo = [
      { letter: 'D', kind: 'force', title: 'Renforcement', restSec: [90, 90], items: [{ id: 'incline-dumbbell-press', sets: 3, reps: 12, rpe: 7, note: 'À la sensation.' }, { id: 'band-pull-apart', sets: 3, reps: 12, rpe: null, note: 'Pendant la récupération.' }] },
      {
        letter: 'E',
        kind: 'conditionnement',
        title: 'Pour le temps',
        items: [
          { id: 'bent-over-row', sets: 4, reps: 20, rpe: 8, note: '20-16-12-8 rowings buste penché aux haltères + développés au sol en pont, pour le temps.', noteBySex: { homme: 'Charges : 2 × 20 kg.', femme: 'Charges : 2 × 12 kg.' } },
          { id: 'glute-bridge-floor-press', sets: 4, reps: 20, rpe: 8 },
        ],
      },
    ]
  }
  const finisher: AtpBlockDef | null =
    b === 1
      ? {
          letter: 'F',
          kind: 'accessoire',
          title: 'Si tu as le temps',
          optional: true,
          restSec: [60, 120],
          items: [
            { id: 'eccentric-barbell-curl', sets: 3, reps: 4, rpe: 8 },
            { id: 'superman-banded-row', sets: 3, reps: 10, rpe: 6 },
            { id: 'lateral-raise', sets: 3, reps: 15, rpe: 7, note: 'Partielles, en haut du mouvement.' },
          ],
        }
      : null
  return [warm, power, strength, ...renfo, ...(finisher ? [finisher] : [])]
}

// ---------------------------------------------------------------------------------------------
// Accessoire + récupération (J4, facultatif, faible intensité)
// ---------------------------------------------------------------------------------------------

function accessoryBlocks(week: number): AtpBlockDef[] {
  const b = weekBlock(week)
  const bike: AtpBlockDef = {
    letter: 'D',
    kind: 'recuperation',
    title: 'Vélo zone 2',
    items: [{ id: 'easy-bike', sets: 1, reps: 30, unit: 'min', rpe: 3, note: '20 à 40 min facile, tu dois pouvoir parler. Option : 1 min de gainage sur les coudes toutes les 5 min.' }],
  }
  if (b === 1) {
    return [
      A([
        { id: 'upper-self-massage', sets: 1, reps: 4, unit: 'min' },
        { id: 'band-clean-press', sets: 3, reps: 6 },
        { id: 'hollow-hold', sets: 3, reps: 30, unit: 's' },
        { id: 'plank', sets: 3, reps: 5, perSide: true, note: 'Planche coudes avec ouverture.' },
      ]),
      {
        letter: 'B',
        kind: 'accessoire',
        title: '15 min, max de tours',
        items: [
          { id: 'dumbbell-bear-crawl', sets: 1, reps: 15, unit: 'min', rpe: 5, note: '10 m en avant, 10 m en arrière, 10 touches d’épaule, 15 écartés à l’élastique, le plus de tours en 15 min sans forcer.' },
          { id: 'shoulder-tap-quadruped', sets: 1, reps: 10, rpe: 5 },
          { id: 'band-pull-apart', sets: 1, reps: 15, rpe: null },
        ],
      },
      {
        letter: 'C',
        kind: 'accessoire',
        title: 'Grip et chaîne postérieure',
        restSec: [30, 60],
        items: [
          { id: 'shrug-dumbbell', sets: 4, reps: 10, rpe: 6, note: 'Puis 20 s de haussement tenu.' },
          { id: 'farmer-carry', sets: 4, reps: 30, rpe: 6, note: '30 m (sur place si besoin).' },
          { id: 'single-leg-nordic-plank', sets: 4, reps: 30, unit: 's', rpe: 6 },
        ],
      },
      bike,
    ]
  }
  if (b === 2) {
    return [
      A([
        { id: 'upper-self-massage', sets: 1, reps: 4, unit: 'min' },
        { id: 'mini-band-proprioception', sets: 3, reps: 30, unit: 's', perSide: true },
        { id: 'hollow-hold', sets: 3, reps: 30, unit: 's', perSide: true, note: 'Avec montée de genou et mini-band.' },
        { id: 'loaded-tiptoe-march', sets: 3, reps: 30, unit: 's' },
      ]),
      {
        letter: 'B',
        kind: 'accessoire',
        title: 'EMOM 12-15 min',
        items: [
          { id: 'quadruped-transfer', sets: 4, reps: 1, unit: 'min', rpe: 6, note: 'Minute 1 : max de transferts. En semaine 6, charge un peu plus avec un geste irréprochable.' },
          { id: 'pallof-press', sets: 4, reps: week === 4 ? 20 : 30, unit: 's', perSide: true, rpe: 6, note: 'Minute 2, en fente.' },
          { id: 'hammer-curl', sets: 4, reps: 1, unit: 'min', rpe: 6, note: 'Minute 3 : max de curls marteau.' },
        ],
      },
      {
        letter: 'C',
        kind: 'cou',
        title: 'Haut du dos, grip et cou',
        restSec: [30, 60],
        items: [
          { id: 'rhomboid-band', sets: week === 6 ? 5 : 4, reps: week === 6 ? 60 : 25, unit: week === 6 ? 's' : 'reps', rpe: 5, note: week === 6 ? '' : '100 tirages au total, pour la qualité.' },
          { id: 'suitcase-hold', sets: week === 6 ? 5 : 4, reps: 30, unit: 's', perSide: true, rpe: 7 },
          { id: 'weighted-neck-curl', sets: week === 6 ? 5 : 4, reps: 12, rpe: 6 },
        ],
      },
      bike,
    ]
  }
  return [
    A([
      { id: 'upper-self-massage', sets: 1, reps: 4, unit: 'min' },
      { id: 'tripod-plank', sets: 3, reps: 30, unit: 's', perSide: true },
      { id: 'single-leg-rdl-row', sets: 3, reps: 8, perSide: true },
      { id: 'scapular-stability', sets: 3, reps: 10 },
    ]),
    {
      letter: 'B',
      kind: 'accessoire',
      title: 'Accessoire',
      restSec: [60, 60],
      items: [
        { id: 'med-ball-plank-row', sets: 3, reps: 30, unit: 's', perSide: true, rpe: 6 },
        { id: 'paused-one-arm-row', sets: 4, reps: 8, perSide: true, rpe: 7 },
        { id: 'single-leg-bent-over-bpa', sets: 4, reps: 10, perSide: true, rpe: 6 },
      ],
    },
    {
      letter: 'C',
      kind: 'tronc',
      title: 'Gainage lesté',
      items: [
        { id: 'weighted-plank', sets: 1, reps: 5, unit: 'min', rpe: 7, note: 'Cumule 5 min. À chaque pause : 10 V-ups et 3 Jefferson curls.' },
        { id: 'v-up', sets: 3, reps: 10, rpe: 6 },
        { id: 'jefferson-curl', sets: 3, reps: 3, rpe: null },
      ],
    },
    bike,
  ]
}

// ---------------------------------------------------------------------------------------------
// Full body (J6)
// ---------------------------------------------------------------------------------------------

function fullBlocks(week: number): AtpBlockDef[] {
  const b = weekBlock(week)
  const warm =
    b === 1
      ? A([
          { id: 'lower-mobility-flow', sets: 1, reps: 4, unit: 'min' },
          { id: 'drop-jump-landing', sets: 3, reps: 5, perSide: true },
          { id: 'airplane', sets: 3, reps: 8, perSide: true },
          { id: 'band-deadlift-row', sets: 3, reps: 8, perSide: true },
        ])
      : b === 2
        ? A([
            { id: 'lower-mobility-flow', sets: 1, reps: 4, unit: 'min' },
            { id: 'seated-l-fly', sets: 3, reps: 8, perSide: true },
            { id: 'single-leg-rdl', sets: 3, reps: 8, perSide: true, note: 'Deux kettlebells ou haltères, léger.' },
            { id: 'hip-flexor-drill', sets: 3, reps: 8, perSide: true },
          ])
        : A([
            { id: 'shoulder-mobility', sets: 1, reps: 4, unit: 'min', note: 'Mobilité de la position front rack (épaules, poignets, haut du dos).' },
            { id: 'arnold-z-press', sets: 3, reps: 10, perSide: true },
            { id: 'suitcase-hold', sets: 3, reps: 30, unit: 's', perSide: true },
            { id: 'waiter-squat', sets: 3, reps: 8, perSide: true },
          ])
  const power: AtpBlockDef =
    b === 1
      ? {
          letter: 'B',
          kind: 'puissance',
          title: 'Puissance',
          restSec: [60, 120],
          items: [
            { id: 'clean-rotation-fend', sets: 4, reps: 3, perSide: true, rpe: 8, line: 'avants', note: 'Avants : lourd, vitesse maximale.' },
            { id: 'clean-rotation-fend', sets: 4, reps: 3, perSide: true, rpe: 7, line: 'arrieres', note: 'Arrières : léger et explosif.' },
          ],
        }
      : b === 2
        ? {
            letter: 'B',
            kind: 'puissance',
            title: 'Puissance',
            restSec: [60, 120],
            items: [
              { id: 'clean-fend-split-jump', sets: 4, reps: 1, perSide: true, rpe: 8, line: 'avants' },
              { id: 'landmine-lateral-step', sets: 4, reps: 3, perSide: true, rpe: 8, line: 'arrieres' },
            ],
          }
        : {
            letter: 'B',
            kind: 'puissance',
            title: 'Puissance',
            restSec: [60, 120],
            items: [
              { id: 'sumo-deadlift-high-pull', sets: 4, reps: 6, rpe: 8, line: 'avants', note: 'Explose avec les jambes, tire haut et lourd.' },
              { id: 'banded-broad-jump', sets: 4, reps: 5, rpe: 8, line: 'arrieres' },
            ],
          }
  const strength: AtpBlockDef = { letter: 'C', kind: 'force', title: 'Force · soulevé de terre', strengthLift: 'souleve-de-terre', items: [] }
  const pullReps = b === 1 ? { reps: 6, repsMax: 10 } : b === 2 ? { reps: 4, repsMax: 8 } : { reps: 3, repsMax: 5 }
  const forwards: AtpItem =
    b === 1
      ? { id: 'neck-iso-row', sets: 4, reps: 10, rpe: 8, line: 'avants', note: 'Cou tenu en isométrie pendant un rowing lourd.' }
      : b === 2
        ? { id: 'rdl-barbell-row', sets: 4, reps: 6, rpe: 8, line: 'avants' }
        : week <= 8
          ? { id: 'bent-over-row', sets: 5, reps: 15, rpe: 9, line: 'avants', note: 'Pyramide 15-12-9-12-15, charge qui monte jusqu’à 9. 1 min 30 de repos.' }
          : { id: 'bent-over-row', sets: 3, reps: 12, rpe: 7, line: 'avants', note: 'À la sensation.' }
  const renfoD: AtpBlockDef = {
    letter: 'D',
    kind: 'force',
    title: 'Renforcement par poste',
    restSec: [60, 120],
    items: [{ id: 'pull-up-weighted', sets: 4, ...pullReps, rpe: 8, line: 'arrieres', note: 'Tractions strictes, lestées dès que possible : augmente la charge.' }, forwards],
  }
  const renfoE: AtpBlockDef =
    b === 1
      ? { letter: 'E', kind: 'force', title: 'Renforcement', restSec: [60, 120], items: [{ id: 'bird-dog-row', sets: 4, reps: 8, perSide: true, rpe: 8 }, { id: 'weighted-push-up-dumbbells', sets: 4, reps: 6, rpe: 8 }] }
      : week <= 5
        ? { letter: 'E', kind: 'force', title: 'Renforcement', restSec: [60, 120], items: [{ id: 'muscle-clean-press', sets: 4, reps: 10, rpe: 7 }, { id: 'barbell-front-raise', sets: 4, reps: 10, rpe: 7 }, { id: 'weighted-hollow', sets: 4, reps: 30, unit: 's', rpe: 7 }] }
        : { letter: 'E', kind: 'accessoire', title: 'Finisher', restSec: [60, 120], items: [{ id: 'rear-delt-fly', sets: 3, reps: 15, rpe: 7 }, { id: 'lateral-raise', sets: 3, reps: 15, rpe: 7 }, { id: 'triceps-extension', sets: 3, reps: 15, rpe: 7 }] }
  const finisher: AtpBlockDef | null =
    b === 1
      ? {
          letter: 'F',
          kind: 'accessoire',
          title: 'Si tu as le temps',
          optional: true,
          restSec: [60, 120],
          items: [
            { id: 'unilateral-floor-press', sets: 3, reps: 6, perSide: true, rpe: 7 },
            { id: 'unilateral-bar-hold', sets: 3, reps: 30, unit: 's', perSide: true, rpe: 7 },
            { id: 'kneeling-split-rotation', sets: 3, reps: 6, perSide: true, rpe: 6 },
          ],
        }
      : null
  return [warm, power, strength, renfoD, renfoE, ...(finisher ? [finisher] : [])]
}

// ---------------------------------------------------------------------------------------------
// Récupération (J7, facultative)
// ---------------------------------------------------------------------------------------------

function recoveryBlocks(): AtpBlockDef[] {
  return [
    {
      letter: 'A',
      kind: 'recuperation',
      title: 'Zone 2 ou repos',
      items: [
        {
          id: 'easy-bike',
          sets: 1,
          reps: 45,
          unit: 'min',
          rpe: 3,
          note: 'Au choix : vélo sur du plat (1 à 3 h), randonnée, footing de 45-60 min en pouvant parler, natation 30-40 min, ou repos complet. Sommeil et hydratation d’abord.',
        },
      ],
    },
  ]
}

/** Blocs d'une séance ATP de la semaine `week` (1 à 9). */
export function atpBlocks(day: AtpDay, week: number): AtpBlockDef[] {
  if (!Number.isInteger(week) || week < 1 || week > 9) throw new Error(`Semaine du programme invalide : ${week}`)
  switch (day) {
    case 'lower':
      return lowerBlocks(week)
    case 'upper':
      return upperBlocks(week)
    case 'conditioning':
      return conditioningBlocks(week)
    case 'accessoire':
      return accessoryBlocks(week)
    case 'terrain':
      return fieldBlocks(week)
    case 'full':
      return fullBlocks(week)
    case 'recup':
      return recoveryBlocks()
  }
}

/** Activation ATP en 3 tours propre à un type de séance, réutilisée en saison (bloc A après l'Activate court). */
export function atpActivation(kind: 'lower' | 'upper' | 'full', week: number): AtpItem[] {
  const blocks = kind === 'lower' ? lowerBlocks(week) : kind === 'upper' ? upperBlocks(week) : fullBlocks(week)
  return blocks.find((bl) => bl.letter === 'A')?.items.filter((i) => i.unit !== 'min') ?? []
}

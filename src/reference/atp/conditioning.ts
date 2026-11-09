import type { AtpBlockDef } from './types'

/*
 * Conditioning du mercredi (J3) de la méthode ATP, semaines 1 à 9 (section 5.1 de l'analyse, reformulée).
 * Les piliers, talonneurs et deuxièmes lignes (postes 1 à 5) font moins de séries ; tous les autres font le volume complet.
 * Les AMRAP sont prescrits en minutes : `sets` passages de `reps` minutes, récupération dans `restSec`.
 */

function warmup(week: number): AtpBlockDef {
  const items =
    week <= 2
      ? [
          { id: 'pogo-jumps', sets: 3, reps: 30, unit: 's' as const, perSide: true, note: 'Pogo en fente, ou 8/8 fentes athlétiques.' },
          { id: 'cossack-squat', sets: 3, reps: 8, perSide: true, note: 'Avec une montée de genou en remontant.' },
          { id: 'easy-jog', sets: 3, reps: 1, unit: 'min' as const, note: 'Un tour de terrain.' },
          { id: 'progressive-shuttles', sets: 2, reps: 1, note: 'Navettes 0-20, 0-40, 0-60 m à allure croissante.' },
        ]
      : week === 3
        ? [
            { id: 'athletic-lunge', sets: 3, reps: 8, perSide: true },
            { id: 'cossack-squat', sets: 3, reps: 8, perSide: true },
            { id: 'progressive-shuttles', sets: 3, reps: 1, note: 'Courses de 5, 10, 15 et 20 m, chacune suivie de 2 m en marche arrière.' },
          ]
        : week <= 6
          ? [
              { id: 'burpee', sets: 3, reps: 10 },
              { id: 'duck-walk', sets: 3, reps: 22, note: '22 m.' },
              { id: 'progressive-shuttles', sets: 3, reps: 5, note: '5 × (10 m de course + un passage au sol).' },
            ]
          : [
              { id: 'running-drills', sets: 3, reps: 1, note: '30 m de A skip, 20 m de skip avant hanche fermée, 20 m de skip arrière hanche ouverte, 30 m de course.' },
              { id: 'progressive-shuttles', sets: 1, reps: 1, note: 'Montée en régime sur les distances de la séance.' },
            ]
  return { letter: 'A', kind: 'echauffement', title: 'Échauffement terrain', items: items.map((i) => ({ ...i, rpe: null })) }
}

const AMRAP: Record<number, { minutes: number; rest: number; note: string }> = {
  4: { minutes: 3, rest: 120, note: 'P1 : échelle de burpees (1, 2, 3…) et de fentes sautées (2, 4, 6…) avec un aller-retour de 5 m. P2 : allers-retours de 5, 22, 40, 50 et 60 m en boucle. Ordre P1, P2, P1, P2.' },
  5: { minutes: 4, rest: 120, note: 'Mêmes circuits qu’en semaine 4, effort plus long.' },
  6: { minutes: 5, rest: 150, note: 'P1 : 5 burpees, quadrupédie, course arrière, accélérations de 22 et 40 m, 5 retournements de sac ou poussée de traîneau, retour en sprint. P2 : 0 → 50 → 100 → 50 → 0 m avec 3 puis 6 burpees à chaque étape.' },
  7: { minutes: 6, rest: 180, note: 'P1 : burpees, navette 0-5-0-10-0-15-0, burpees, 15 squat jumps, burpees, 20 climbers. P2 : navette géante 0-20-0-40-0-60-0-80-0-100-0 en boucle.' },
  8: { minutes: 6, rest: 120, note: 'P1 : burpees, 10 m de bear crawl, 5 chenilles, 10 m de course, 3 burpees, 10 m de course, 5 chenilles, 10 m de bear crawl. P2 : navette 0-20-0-40-0-60 en boucle.' },
}

/** Bloc principal et finisher du conditioning de la semaine. */
export function conditioningBlocks(week: number): AtpBlockDef[] {
  const blocks: AtpBlockDef[] = [warmup(week)]
  if (week === 1 || week === 9) {
    blocks.push({
      letter: 'B',
      kind: 'test',
      title: 'Test Bronco',
      tests: ['bronco'],
      items: [{ id: 'bronco-test', sets: 1, reps: 1, rpe: 10, note: 'Note ton temps dans Records.' }],
    })
    blocks.push({
      letter: 'C',
      kind: 'finisher',
      title: 'Finisher',
      optional: true,
      restSec: week === 9 ? [180, 180] : [15, 30],
      items:
        week === 1
          ? [{ id: 'run-burpee-intervals', sets: 6, reps: 1, repsMax: 10, rpe: 9 }]
          : [{ id: 'max-distance-30-15', sets: 2, reps: 10, rpe: 9 }],
    })
    return blocks
  }
  if (week === 2) {
    blocks.push({
      letter: 'B',
      kind: 'conditionnement',
      title: 'Pyramide navettes + burpees',
      restSec: [180, 180],
      items: [{ id: 'shuttle-burpee-pyramid', sets: 4, setsTight5: 3, reps: 1, rpe: 9 }],
    })
    return blocks
  }
  if (week === 3) {
    blocks.push({
      letter: 'B',
      kind: 'conditionnement',
      title: 'Départ toutes les 30 s',
      restSec: [150, 150],
      items: [{ id: 'every-30s-shuttles', sets: 5, setsTight5: 3, reps: 5, rpe: 9, note: '5 départs par série.' }],
    })
    return blocks
  }
  const a = AMRAP[week]
  if (!a) throw new Error(`Semaine du programme invalide : ${week}`)
  const tight = week >= 7 ? ' Postes 1 à 5 : 3 burpees au lieu de 5.' : ''
  blocks.push({
    letter: 'B',
    kind: 'conditionnement',
    title: `AMRAP ${a.minutes} min`,
    restSec: [a.rest, a.rest],
    items: [{ id: 'amrap-shuttles-burpees', sets: 4, reps: a.minutes, unit: 'min', rpe: 9, note: `4 passages de ${a.minutes} min, ${a.rest / 60} min de récupération. ${a.note}${tight}` }],
  })
  return blocks
}

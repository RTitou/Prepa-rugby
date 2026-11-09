import { describe, expect, it } from 'vitest'
import { addDays } from '../../src/engine/dates'
import { buildWeek, type BuildWeekInput } from '../../src/engine/week-builder/buildWeek'
import { composeSession, type ComposeInput } from '../../src/engine/week-builder/composeSession'
import type { PrescribedExercise, Session } from '../../src/types/plan'
import type { TrainingGoals } from '../../src/types/profile'

function make(goals?: TrainingGoals, overrides: Partial<ComposeInput> = {}): ComposeInput {
  return {
    date: '2026-10-07',
    slot: 'bas-force',
    index: 0,
    profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois', ...(goals ? { goals } : {}) },
    rotation: 41,
    deload: false,
    includeSpeed: false,
    ...overrides,
  }
}

const g = (primary: TrainingGoals['primary'], secondary: TrainingGoals['secondary'] = null): TrainingGoals => ({ primary, secondary })
const groupSets = (s: Session, letter: string) => s.exercises.filter((e) => e.group === letter).reduce((n, e) => n + e.prescription.sets, 0)
const find = (s: Session, id: string): PrescribedExercise | undefined => s.exercises.find((e) => e.exerciseId === id)

describe('objectifs en saison', () => {
  const plain = composeSession(make())

  it('sans objectif : séance inchangée, pas de raison d’objectif', () => {
    expect(plain.reasons.some((r) => r.code.startsWith('objectif'))).toBe(false)
  })

  it('puissance principal : un exercice de puissance en B et une série de plus sur le bloc B', () => {
    const s = composeSession(make(g('puissance')))
    expect(find(s, 'hang-power-clean')?.group).toBe('B')
    expect(groupSets(s, 'B')).toBeGreaterThan(groupSets(plain, 'B'))
    expect(s.reasons.find((r) => r.code === 'objectif-principal')?.text).toContain('Puissance')
  })

  it('débutant avec objectif puissance : la force d’abord (Cormie 2011, Suchomel 2018)', () => {
    const beginner = (goals?: TrainingGoals) =>
      composeSession(make(goals, { slot: 'corps-entier', profile: { position: 9, sex: 'homme', liftingExperience: 'moins-6-mois', ...(goals ? { goals } : {}) } }))
    const base = beginner()
    const s = beginner(g('puissance'))
    expect(s.exercises.find((e) => e.group === 'C')!.prescription.sets).toBe(base.exercises.find((e) => e.group === 'C')!.prescription.sets + 1)
    expect(find(s, 'hang-power-clean')).toBeUndefined()
    expect(find(s, 'med-ball-slam')?.group).toBe('B')
    expect(s.reasons.find((r) => r.code === 'objectif-principal')?.text).toContain('d’abord de la force')
  })

  it('bloc puissance : 2 à 3 min de récupération', () => {
    const s = composeSession(make(g('puissance')))
    expect(find(s, 'hang-power-clean')?.restSec).toEqual([120, 180])
  })

  it('explosivité principal : sauts réactifs en B', () => {
    const s = composeSession(make(g('explosivite')))
    expect(find(s, 'pogo-jumps')?.group).toBe('B')
  })

  it('force / hypertrophie principal : une série de plus en C et renforcement 4 × 8-12', () => {
    const s = composeSession(make(g('force-hypertrophie')))
    const c = s.exercises.find((e) => e.group === 'C')!
    expect(c.prescription.sets).toBe(plain.exercises.find((e) => e.group === 'C')!.prescription.sets + 1)
    const d = s.exercises.filter((e) => e.group === 'D' && e.prescription.unit === 'reps')
    expect(d.length).toBeGreaterThan(0)
    for (const e of d) expect(e.prescription).toMatchObject({ reps: 8, repsMax: 12 })
    expect(d.some((e) => e.prescription.sets === 4)).toBe(true)
  })

  it('endurance : intermittent en fin de séance, 2 blocs en principal, 1 en secondaire', () => {
    const primary = composeSession(make(g('endurance')))
    const secondary = composeSession(make(g('puissance', 'endurance')))
    expect(find(primary, 'bike-intermittent')).toMatchObject({ group: 'E', prescription: { sets: 2, reps: 6, unit: 'min' } })
    expect(find(secondary, 'bike-intermittent')?.prescription.sets).toBe(1)
    expect(secondary.reasons.find((r) => r.code === 'objectif-secondaire')?.text).toContain('Endurance')
  })

  it('le secondaire pèse moins que le principal', () => {
    const asPrimary = composeSession(make(g('puissance')))
    const asSecondary = composeSession(make(g('endurance', 'puissance')))
    expect(find(asSecondary, 'hang-power-clean')).toBeDefined()
    expect(find(asSecondary, 'hang-power-clean')!.prescription.sets).toBeLessThan(find(asPrimary, 'hang-power-clean')!.prescription.sets)
  })

  it('endurance principal : un conditionnement de plus en semaine sans match', () => {
    const input = (goals?: TrainingGoals): BuildWeekInput => ({
      weekStart: '2026-10-05',
      today: '2026-10-05',
      profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois', ...(goals ? { goals } : {}) },
      clubDays: [{ weekday: 2, intensity: 'normal', durationMin: 90 }],
      matches: [],
      cycleIndex: 0,
    })
    const count = (goals?: TrainingGoals) => buildWeek(input(goals)).days.filter((d) => d.session?.kind === 'conditionnement').length
    expect(count(g('endurance'))).toBe(count() + 1)
  })
})

describe('objectifs en intersaison', () => {
  const week = (goals?: TrainingGoals) =>
    buildWeek({
      weekStart: addDays('2026-10-05', 7),
      today: addDays('2026-10-05', 7),
      profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois', programWeek: 2, ...(goals ? { goals } : {}) },
      clubDays: [],
      matches: [],
      cycleIndex: 0,
    }).days
  const slot = (days: ReturnType<typeof week>, s: string) => days.find((d) => d.session?.slot === s)!.session!

  it('force principal : une série de plus en D sur les séances de salle', () => {
    expect(groupSets(slot(week(g('force-hypertrophie')), 'atp-lower'), 'D')).toBeGreaterThan(groupSets(slot(week(), 'atp-lower'), 'D'))
  })

  it('explosivité principal : terrain renforcé, salle inchangée', () => {
    const days = week(g('explosivite'))
    expect(groupSets(slot(days, 'atp-terrain'), 'B')).toBeGreaterThan(groupSets(slot(week(), 'atp-terrain'), 'B'))
    expect(groupSets(slot(days, 'atp-lower'), 'B')).toBe(groupSets(slot(week(), 'atp-lower'), 'B'))
  })

  it('endurance principal : conditioning renforcé et vélo plus long', () => {
    const days = week(g('endurance'))
    expect(groupSets(slot(days, 'atp-conditioning'), 'B')).toBeGreaterThan(groupSets(slot(week(), 'atp-conditioning'), 'B'))
    expect(find(slot(days, 'atp-accessoire'), 'easy-bike')?.prescription.reps).toBe(45)
  })
})

describe('prévention et sprints répétés', () => {
  const season = (goals?: TrainingGoals, experience: 'moins-6-mois' | '6-24-mois' | 'plus-24-mois' = '6-24-mois') =>
    buildWeek({
      weekStart: '2026-10-05',
      today: '2026-10-05',
      profile: { position: 9, sex: 'homme', liftingExperience: experience, ...(goals ? { goals } : {}) },
      clubDays: [{ weekday: 2, intensity: 'normal', durationMin: 90 }],
      matches: [],
      cycleIndex: 0,
    }).days
  const all = (days: ReturnType<typeof season>) => days.flatMap((d) => d.session?.exercises ?? [])

  it('en saison : un Nordic et une planche Copenhague par semaine (van Dyk 2019, Harøy 2019)', () => {
    const ex = all(season())
    expect(ex.filter((e) => e.exerciseId.startsWith('nordic'))).toHaveLength(1)
    expect(ex.filter((e) => e.exerciseId === 'copenhagen')).toHaveLength(1)
    expect(ex.find((e) => e.exerciseId === 'nordic-assisted')?.prescription).toMatchObject({ sets: 2, reps: 5 })
    expect(all(season(undefined, 'plus-24-mois')).some((e) => e.exerciseId === 'nordic-curl')).toBe(true)
  })

  it('en intersaison : Copenhague 3 fois et Nordic 2 fois par semaine', () => {
    const days = buildWeek({
      weekStart: '2026-10-12',
      today: '2026-10-12',
      profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois', programWeek: 2 },
      clubDays: [],
      matches: [],
      cycleIndex: 0,
    }).days
    const ex = all(days)
    expect(ex.filter((e) => e.exerciseId === 'copenhagen')).toHaveLength(3)
    expect(ex.filter((e) => e.exerciseId.startsWith('nordic'))).toHaveLength(2)
    for (const e of ex.filter((x) => x.block === 'prevention')) expect(e.optional).toBeUndefined()
  })

  it('genou ou ischios blessés : le Nordic est retiré ou remplacé', () => {
    const days = buildWeek({
      weekStart: '2026-10-05',
      today: '2026-10-05',
      profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois' },
      clubDays: [],
      matches: [],
      cycleIndex: 0,
      context: { injuryZones: ['ischios'] },
    }).days
    expect(all(days).some((e) => e.exerciseId.startsWith('nordic'))).toBe(false)
  })

  it('objectif endurance principal : le conditionnement ajouté est en sprints répétés', () => {
    const cond = season(g('endurance')).filter((d) => d.session?.kind === 'conditionnement').map((d) => d.session!)
    expect(cond).toHaveLength(2)
    const rst = cond.find((s) => s.title === 'Sprints répétés')
    expect(rst?.exercises[0]).toMatchObject({ exerciseId: 'repeated-sprints', prescription: { sets: 3, reps: 6 } })
    expect(cond.filter((s) => s.title === 'Sprints répétés')).toHaveLength(1)
  })
})

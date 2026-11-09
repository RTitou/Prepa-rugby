import { describe, expect, it } from 'vitest'
import { mergeContexts, type PlanContext } from '../../src/engine/context'
import { applyInjuries, injuryContext } from '../../src/engine/injuries/applyInjuries'
import { evaluateSuspension } from '../../src/engine/injuries/suspension'
import { buildWeek, type BuildWeekInput, type ClubLite } from '../../src/engine/week-builder/buildWeek'
import { getExercise } from '../../src/reference/exercises/library'
import { SEVERE_SIGNS, SUBSTITUTION_RULES, isExcludedByZones } from '../../src/reference/substitutions/table'
import type { Injury } from '../../src/types/injury'
import type { LiftingExperience, PositionNumber } from '../../src/types/profile'
import type { DayPlan, Session } from '../../src/types/plan'
import { BODY_ZONES, type BodyZone } from '../../src/types/reference'

const MONDAY = '2026-10-05'
const CLUB: ClubLite[] = [
  { weekday: 2, intensity: 'lourd', durationMin: 90 },
  { weekday: 4, intensity: 'normal', durationMin: 90 },
]
const ALL_ZONES = BODY_ZONES.map((z) => z.value)

function input(overrides: Partial<BuildWeekInput> = {}): BuildWeekInput {
  return {
    weekStart: MONDAY,
    today: MONDAY,
    profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois' },
    clubDays: CLUB,
    matches: [{ date: '2026-10-10', time: null }],
    cycleIndex: 0,
    ...overrides,
  }
}

const sessions = (days: DayPlan[]): Session[] => days.flatMap((d) => (d.session ? [d.session] : []))
const ids = (days: DayPlan[]): string[] => sessions(days).flatMap((s) => s.exercises.map((e) => e.exerciseId))
const replaced = (days: DayPlan[]): string[] => sessions(days).flatMap((s) => s.exercises.flatMap((e) => (e.replaces ? [e.replaces.exerciseId] : [])))

function injury(zone: BodyZone, extra: Partial<Injury> = {}): Injury {
  return {
    id: `i-${zone}`,
    updatedAt: '2026-10-05T08:00:00.000Z',
    deletedAt: null,
    zone,
    status: 'active',
    declaredOn: MONDAY,
    healedOn: null,
    severeSigns: [],
    comment: '',
    ...extra,
  }
}

const ctx = (...zones: BodyZone[]): PlanContext => ({ injuryZones: zones })

describe('blessure au genou', () => {
  const normal = buildWeek(input())
  const hurt = buildWeek(input({ context: ctx('genou') }))

  it('remplace le squat profond et les sprints, et signale chaque remplacement', () => {
    expect(ids(normal.days)).toContain('back-squat')
    expect(ids(normal.days)).toContain('sprint-fly-30m')
    expect(ids(hurt.days)).not.toContain('back-squat')
    expect(ids(hurt.days)).not.toContain('sprint-fly-30m')
    expect(replaced(hurt.days)).toEqual(expect.arrayContaining(['back-squat', 'sprint-fly-30m']))
    for (const s of sessions(hurt.days)) {
      for (const e of s.exercises) if (e.replaces) expect(e.replaces.zone).toBe('genou')
    }
  })

  it('utilise un substitut de la table quand la catégorie en a un', () => {
    const squat = sessions(hurt.days)
      .flatMap((s) => s.exercises)
      .find((e) => e.replaces?.exerciseId === 'back-squat')!
    expect(['hip-thrust', 'glute-bridge', 'bridge-march']).toContain(squat.exerciseId)
  })

  it('reste déterministe', () => {
    expect(JSON.stringify(buildWeek(input({ context: ctx('genou') })))).toBe(JSON.stringify(hurt))
  })

  it('ajoute une raison de source blessure sur la séance adaptée', () => {
    const adapted = sessions(hurt.days).filter((s) => s.reasons.some((r) => r.code === 'blessure-adaptation'))
    expect(adapted.length).toBeGreaterThan(0)
    expect(adapted[0]!.reasons.find((r) => r.code === 'blessure-adaptation')!.source).toBe('blessure')
  })
})

describe('plusieurs zones cumulées', () => {
  it('genou + épaule : aucun exercice ne sollicite l’une ou l’autre', () => {
    for (const experience of ['moins-6-mois', '6-24-mois', 'plus-24-mois'] as LiftingExperience[]) {
      const week = buildWeek(input({ profile: { position: 9, sex: 'homme', liftingExperience: experience }, context: ctx('epaule', 'genou') }))
      for (const id of ids(week.days)) {
        const ex = getExercise(id)!
        expect(ex.zones, id).not.toContain('genou')
        expect(ex.zones, id).not.toContain('epaule')
        expect(isExcludedByZones(['epaule', 'genou'], ex), id).toBe(false)
      }
    }
  })

  it('fusionne les zones de plusieurs contextes sans doublon', () => {
    expect(mergeContexts([ctx('genou'), ctx('epaule', 'genou')]).injuryZones).toEqual(['epaule', 'genou'])
  })
})

describe('aucun substitut possible', () => {
  const session = sessions(buildWeek(input()).days).find((s) => s.slot === 'bas-force')!

  it('remplace par de la mobilité ou de la récupération quand la catégorie n’a pas de substitut', () => {
    const out = applyInjuries(session, ['genou'], '6-24-mois')
    const sprint = out.exercises.find((e) => e.replaces?.exerciseId === 'sprint-fly-30m')!
    expect(['mobilite-recuperation', 'aerobie-leger']).toContain(getExercise(sprint.exerciseId)!.category)
    expect(sprint.block).toBe('recuperation')
    expect(sprint.prescription.targetRpe).toBeNull()
  })

  it('retire le bloc et le signale quand il n’y a plus de repli', () => {
    const out = applyInjuries(session, ALL_ZONES, '6-24-mois')
    expect(out.exercises.length).toBeLessThan(session.exercises.length)
    expect(out.reasons.some((r) => r.code.startsWith('blessure-retire-'))).toBe(true)
    for (const e of out.exercises) expect(isExcludedByZones(ALL_ZONES, getExercise(e.exerciseId)!)).toBe(false)
  })
})

describe('suspension', () => {
  it('commotion suspectée ou confirmée : plan suspendu, délai World Rugby', () => {
    const s = evaluateSuspension([injury('tete')])
    expect(s.suspended).toBe(true)
    expect(s.causes).toContain('commotion')
    expect(s.minDaysBeforePlaying).toBe(21)
    expect(s.messages.join(' ')).toMatch(/avis médical/i)
  })

  it('un signe grave coché suspend le plan, quelle que soit la zone', () => {
    const s = evaluateSuspension([injury('genou', { severeSigns: [SEVERE_SIGNS[0]!.id] })])
    expect(s.suspended).toBe(true)
    expect(s.causes).toEqual(['signe-grave'])
    expect(s.minDaysBeforePlaying).toBeNull()
  })

  it('une blessure simple ne suspend pas', () => {
    expect(evaluateSuspension([injury('genou')]).suspended).toBe(false)
  })

  it('le contexte porte la suspension et buildWeek ne place plus aucune séance à venir', () => {
    const c = injuryContext([injury('tete')])
    expect(c.suspended).toBe(true)
    const week = buildWeek(input({ context: c }))
    expect(sessions(week.days)).toHaveLength(0)
    expect(week.days.every((d) => d.reasons.some((r) => r.code === 'plan-suspendu'))).toBe(true)
  })
})

describe('guérison', () => {
  it('une blessure guérie ou supprimée n’a plus aucun effet : exercices d’origine rétablis', () => {
    const healed = injuryContext([injury('genou', { status: 'guerie', healedOn: '2026-10-06' }), injury('tete', { deletedAt: 'x' })])
    expect(healed).toEqual({})
    expect(JSON.stringify(buildWeek(input({ context: healed })))).toBe(JSON.stringify(buildWeek(input())))
  })

  it('les blessures actives donnent les zones triées et une raison par zone', () => {
    const c = injuryContext([injury('genou'), injury('epaule')])
    expect(c.injuryZones).toEqual(['epaule', 'genou'])
    expect(c.reasons?.map((r) => r.code)).toEqual(['blessure-epaule', 'blessure-genou'])
    expect(c.suspended).toBeUndefined()
  })
})

describe('propriété : aucun exercice prescrit ne sollicite une zone active', () => {
  const profiles: { position: PositionNumber; experience: LiftingExperience }[] = [
    { position: 9, experience: 'moins-6-mois' },
    { position: 3, experience: '6-24-mois' },
    { position: 8, experience: 'plus-24-mois' },
  ]
  const weeks = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']
  const calendars: { club: ClubLite[]; matches: { date: string; time: string | null }[] }[] = [
    { club: CLUB, matches: [{ date: '2026-10-10', time: null }] },
    { club: [], matches: [] },
  ]

  it.each(ALL_ZONES)('zone %s', (zone) => {
    for (const p of profiles) {
      for (const cal of calendars) {
        weeks.forEach((weekStart, i) => {
          const week = buildWeek({
            weekStart,
            today: weekStart,
            profile: { position: p.position, sex: 'homme', liftingExperience: p.experience },
            clubDays: cal.club,
            matches: cal.matches,
            cycleIndex: i,
            context: ctx(zone),
          })
          for (const s of sessions(week.days)) {
            for (const e of s.exercises) {
              expect(isExcludedByZones([zone], getExercise(e.exerciseId)!), `${zone} ${weekStart} ${s.slot} ${e.exerciseId}`).toBe(false)
            }
          }
        })
      }
    }
  })

  it('deux zones à la fois, sur chaque paire de la table', () => {
    for (let a = 0; a < ALL_ZONES.length; a++) {
      for (let b = a + 1; b < ALL_ZONES.length; b++) {
        const pair = [ALL_ZONES[a]!, ALL_ZONES[b]!]
        const week = buildWeek(input({ context: ctx(...pair) }))
        for (const id of ids(week.days)) expect(isExcludedByZones(pair, getExercise(id)!), `${pair.join('+')} ${id}`).toBe(false)
      }
    }
  })
})

describe('table de substitution', () => {
  it('chaque zone a un message de consultation', () => {
    for (const r of SUBSTITUTION_RULES) expect(r.message.length).toBeGreaterThan(10)
  })
})

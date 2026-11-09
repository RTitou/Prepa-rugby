import { describe, expect, it } from 'vitest'
import type { PlanContext } from '../../src/engine/context'
import { adaptPlan, type AdaptationInput, type MorningInput } from '../../src/engine/load/adjust'
import { buildWeek, type BuildWeekInput } from '../../src/engine/week-builder/buildWeek'
import { classifyMinutes, compensationExercises, composeCompensation } from '../../src/engine/week-builder/compensation'
import { getExercise } from '../../src/reference/exercises/library'
import type { DayPlan } from '../../src/types/plan'
import type { WellnessScores } from '../../src/types/wellness'

const PROFILE = { position: 9 as const, sex: 'homme' as const, liftingExperience: '6-24-mois' as const }
const MATCH = '2026-10-10' // samedi
const SUNDAY = '2026-10-11' // MD+1
const WEEK = '2026-10-05'
const NEXT = '2026-10-12'

const scores = (v: number): WellnessScores => ({ fatigue: v, sommeil: v, douleurs: v, stress: v, humeur: v })
const sessionsOf = (days: DayPlan[]) => days.flatMap((d) => (d.session ? [d.session] : []))
const muscu = (days: DayPlan[]) => sessionsOf(days).filter((s) => s.kind === 'muscu')
const day = (days: DayPlan[], date: string) => days.find((d) => d.date === date)!

function adapt(over: Partial<AdaptationInput>) {
  return adaptPlan({ weekStart: WEEK, today: SUNDAY, mornings: [], matchRatings: [], loads: [], matches: [{ date: MATCH, time: null }], ...over })
}

function build(weekStart: string, today: string, context: PlanContext, matches = [{ date: MATCH, time: null as string | null }]) {
  const input: BuildWeekInput = {
    weekStart,
    today,
    profile: PROFILE,
    clubDays: [
      { weekday: 2, intensity: 'lourd', durationMin: 90 },
      { weekday: 4, intensity: 'normal', durationMin: 90 },
    ],
    matches,
    cycleIndex: 0,
    context,
  }
  return buildWeek(input)
}

describe('minutes jouées : catégories', () => {
  it.each([
    [0, 'peu'],
    [10, 'peu'],
    [19, 'peu'],
    [20, 'partiel'],
    [40, 'partiel'],
    [59, 'partiel'],
    [60, 'complet'],
    [70, 'complet'],
    [80, 'complet'],
  ])('%i min : %s', (minutes, category) => {
    expect(classifyMinutes(minutes)).toBe(category)
  })
})

describe('séance de compensation', () => {
  it('complète : 15 à 20 min, 4 à 6 sprints, 2 à 3 blocs intermittents calibrés sur les pics, sans contacts', () => {
    const s = composeCompensation({ date: SUNDAY, profile: PROFILE, context: undefined })
    expect(s.slot).toBe('compensation')
    expect(s.durationMin).toBeGreaterThanOrEqual(15)
    expect(s.durationMin).toBeLessThanOrEqual(20)
    const sprint = s.exercises.find((e) => e.block === 'vitesse')!
    const blocks = s.exercises.find((e) => e.block === 'conditionnement')!
    expect(sprint.prescription.sets).toBeGreaterThanOrEqual(4)
    expect(sprint.prescription.sets).toBeLessThanOrEqual(6)
    expect(blocks.prescription.sets).toBeGreaterThanOrEqual(2)
    expect(blocks.prescription.sets).toBeLessThanOrEqual(3)
    expect(blocks.exerciseId).toBe('peak-blocks-run')
    expect(blocks.note).toMatch(/m\/min/) // pic du poste (demi de mêlée : 185 m/min sur 1 min)
    expect(blocks.note).toMatch(/185/)
    for (const e of s.exercises) {
      expect(getExercise(e.exerciseId)!.zones).not.toContain('tete')
      expect(['contact-circuit', 'scrum-push-simulated', 'sled-push-conditioning']).not.toContain(e.exerciseId)
    }
    expect(s.id).toBe(`s-${SUNDAY}-compensation`)
  })

  it('courte : 3 sprints et 2 blocs, plus léger que la complète', () => {
    const short = compensationExercises('courte', PROFILE, undefined)
    const full = compensationExercises('complete', PROFILE, undefined)
    expect(short.find((e) => e.block === 'vitesse')!.prescription.sets).toBe(3)
    expect(short.find((e) => e.block === 'conditionnement')!.prescription.sets).toBe(2)
    expect(short[0]!.prescription.sets).toBeLessThan(full[0]!.prescription.sets)
  })

  it('douleur répétée sur les jambes : les sprints à fort impact sont remplacés par une version à faible impact', () => {
    const ex = compensationExercises('complete', PROFILE, { painZones: ['ischios'] })
    const sprint = ex.find((e) => e.block === 'vitesse')!
    expect(getExercise(sprint.exerciseId)!.impact).not.toBe('fort')
  })
})

describe('70 min jouées : récupération, pas de jambes lourdes avant le retour du ressenti à la normale', () => {
  const rating = { date: MATCH, minutesPlayed: 70, contactIntensity: null }

  it('sans ressenti normal, les jambes lourdes sont bloquées jusqu’à MD+3 et le lendemain est une récupération', () => {
    const { context } = adapt({ matchRatings: [rating] })
    expect(context.blockHeavyLegsUntil).toBe('2026-10-13')
    expect(context.compensation).toBeUndefined()
    expect(context.extraMuscuSession).toBeUndefined()
    const week = build(WEEK, SUNDAY, context)
    const sunday = day(week.days, SUNDAY)
    expect(sunday.session?.slot).toBe('recuperation')
    expect(sunday.session?.exercises.some((e) => e.block === 'vitesse')).toBe(false)
    expect(sunday.reasons.map((r) => r.code)).toContain('minutes-complet')
    expect(sunday.session?.reasons.some((r) => r.source === 'charge' && /jambes lourdes/.test(r.text))).toBe(true)
  })

  it('après un ressenti normal à MD+2, plus de blocage (l’écart de 48 h du moteur suffit)', () => {
    const mornings: MorningInput[] = [{ date: NEXT, scores: scores(4), painZone: null }]
    const { context } = adapt({ weekStart: NEXT, today: NEXT, mornings, matchRatings: [rating] })
    expect(context.blockHeavyLegsUntil).toBeUndefined()
  })

  it('un ressenti dégradé à MD+2 ne lève pas le blocage', () => {
    const mornings: MorningInput[] = [{ date: NEXT, scores: scores(1), painZone: null }]
    const { context } = adapt({ weekStart: NEXT, today: NEXT, mornings, matchRatings: [rating] })
    // ressenti dégradé : alerte d'allègement et blocage maintenu jusqu'à MD+3
    expect(context.blockHeavyLegsUntil).toBe('2026-10-13')
    expect(context.volumeFactor).toBeLessThan(1)
  })

  it('des contacts très intenses prolongent le blocage même si le ressenti est bon', () => {
    const mornings: MorningInput[] = [{ date: NEXT, scores: scores(4), painZone: null }]
    const { context } = adapt({ weekStart: NEXT, today: NEXT, mornings, matchRatings: [{ ...rating, contactIntensity: 5 }] })
    expect(context.blockHeavyLegsUntil).toBe('2026-10-13')
  })

  it('la semaine suivante ne place pas de force du bas du corps avant la fin du blocage', () => {
    const { context } = adapt({ weekStart: NEXT, today: NEXT, matchRatings: [rating] })
    const week = build(NEXT, NEXT, context)
    for (const s of muscu(week.days)) {
      if (s.slot === 'bas-force' || s.slot === 'puissance') expect(s.date > '2026-10-13').toBe(true)
    }
  })
})

describe('40 min jouées : récupération légère et compensation courte possible', () => {
  const rating = { date: MATCH, minutesPlayed: 40, contactIntensity: null }

  it('ajoute un bloc court de sprints et d’intermittent à la récupération de MD+1', () => {
    const { context } = adapt({ matchRatings: [rating] })
    expect(context.compensation).toEqual({ [SUNDAY]: 'courte' })
    const sunday = day(build(WEEK, SUNDAY, context).days, SUNDAY)
    expect(sunday.session?.slot).toBe('recuperation')
    const blocks = sunday.session!.exercises.map((e) => e.block)
    expect(blocks).toContain('vitesse')
    expect(blocks).toContain('conditionnement')
    expect(sunday.session!.exercises.find((e) => e.block === 'vitesse')!.prescription.sets).toBe(3)
  })

  it('pas de compensation en cas de douleur, de contacts intenses ou d’alerte', () => {
    const pain: MorningInput[] = [{ date: SUNDAY, scores: scores(4), painZone: 'ischios' }]
    expect(adapt({ matchRatings: [rating], mornings: pain }).context.compensation).toBeUndefined()
    expect(adapt({ matchRatings: [{ ...rating, contactIntensity: 4 }] }).context.compensation).toBeUndefined()
    const bad: MorningInput[] = [{ date: SUNDAY, scores: scores(1), painZone: null }]
    expect(adapt({ matchRatings: [rating], mornings: bad }).context.compensation).toBeUndefined()
    const sunday = day(build(WEEK, SUNDAY, {}).days, SUNDAY)
    expect(sunday.session?.exercises.some((e) => e.block === 'vitesse')).toBe(false)
  })
})

describe('10 min jouées : compensation à MD+1 et semaine « sans match » côté musculation', () => {
  const rating = { date: MATCH, minutesPlayed: 10, contactIntensity: null }
  const nextMatch = [
    { date: MATCH, time: null as string | null },
    { date: '2026-10-17', time: null as string | null },
  ]

  it('la séance du lendemain est une compensation de 15 à 20 min à la place de la récupération', () => {
    const { context } = adapt({ matchRatings: [rating] })
    expect(context.compensation).toEqual({ [SUNDAY]: 'complete' })
    const sunday = day(build(WEEK, SUNDAY, context).days, SUNDAY)
    expect(sunday.session?.slot).toBe('compensation')
    expect(sunday.kind).toBe('seance')
    expect(sunday.session!.durationMin).toBeLessThanOrEqual(20)
    expect(sunday.session!.reasons.some((r) => r.code === 'minutes-peu' && r.source === 'charge')).toBe(true)
  })

  it('la semaine suivante, avec un match, compte une 3e séance de musculation', () => {
    const { context } = adapt({ weekStart: NEXT, today: SUNDAY, matchRatings: [rating], matches: nextMatch })
    expect(context.extraMuscuSession).toBe(true)
    expect(context.compensation).toBeUndefined() // le lendemain est dans l'autre semaine
    const withExtra = build(NEXT, SUNDAY, context, nextMatch)
    const without = build(NEXT, SUNDAY, {}, nextMatch)
    expect(muscu(without.days)).toHaveLength(2)
    expect(muscu(withExtra.days)).toHaveLength(3)
    expect(muscu(withExtra.days).every((s) => s.reasons.some((r) => r.code === 'semaine-sans-match'))).toBe(true)
  })

  it('non joué (0 min) : même traitement que moins de 20 min', () => {
    const { context } = adapt({ matchRatings: [{ ...rating, minutesPlayed: 0 }] })
    expect(context.compensation).toEqual({ [SUNDAY]: 'complete' })
  })

  it('jamais de rattrapage : sous alerte ou en cas de douleur, ni compensation ni séance en plus', () => {
    const bad: MorningInput[] = [{ date: SUNDAY, scores: scores(1), painZone: null }]
    const alerted = adapt({ matchRatings: [rating], mornings: bad }).context
    expect(alerted.compensation).toBeUndefined()
    expect(alerted.extraMuscuSession).toBeUndefined()
    expect(alerted.volumeFactor).toBeLessThan(1)
    const pain: MorningInput[] = [{ date: SUNDAY, scores: scores(4), painZone: 'genou' }]
    expect(adapt({ matchRatings: [rating], mornings: pain }).context.compensation).toBeUndefined()
    // la compensation n'est jamais proposée à une date passée
    expect(adapt({ today: '2026-10-13', matchRatings: [rating] }).context.compensation).toBeUndefined()
  })

  it('sans minutes saisies ou avant le match, rien ne change', () => {
    expect(adapt({ matchRatings: [{ date: MATCH, minutesPlayed: null, contactIntensity: null }] }).context).toEqual({})
    expect(adapt({ today: '2026-10-09', matchRatings: [rating] }).context).toEqual({})
  })
})

describe('deux matchs à moins de 72 h : mode récupération', () => {
  const matches = [
    { date: MATCH, time: '15:00' as string | null },
    { date: NEXT, time: '10:00' as string | null },
  ]

  it('aucune musculation, uniquement de la récupération, et un signal de surcharge', () => {
    for (const weekStart of [WEEK, NEXT]) {
      const { context } = adapt({ weekStart, today: SUNDAY, matches })
      expect(context.recoveryMode).toBe(true)
      const week = build(weekStart, SUNDAY, context, matches)
      expect(muscu(week.days)).toHaveLength(0)
      expect(sessionsOf(week.days.filter((d) => d.date >= SUNDAY)).every((s) => ['recuperation', 'activation'].includes(s.kind))).toBe(true)
      expect(week.flags.map((f) => f.code)).toEqual(expect.arrayContaining(['matchs-rapproches', 'surcharge']))
    }
    const week = build(NEXT, SUNDAY, adapt({ weekStart: NEXT, today: SUNDAY, matches }).context, matches)
    // le mardi (MD+1 du second match) est un club lourd ; le mercredi (MD+2) reçoit une récupération active
    expect(day(week.days, '2026-10-14').session?.slot).toBe('recuperation')
    expect(day(week.days, '2026-10-13').session).toBeNull()
  })

  it('ni conditionnement ni compensation en mode récupération, même sans match dans la semaine', () => {
    const { context } = adapt({ weekStart: '2026-10-12', today: SUNDAY, matches, matchRatings: [{ date: MATCH, minutesPlayed: 5, contactIntensity: null }] })
    const week = build('2026-10-12', SUNDAY, context, matches)
    expect(sessionsOf(week.days).some((s) => s.slot === 'compensation' || s.slot === 'conditionnement')).toBe(false)
  })
})

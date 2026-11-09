import { describe, expect, it } from 'vitest'
import { mergeContexts } from '../../src/engine/context'
import { addDays, diffDays } from '../../src/engine/dates'
import { buildWeek, type BuildWeekInput, type ClubLite } from '../../src/engine/week-builder/buildWeek'
import type { LiftingExperience } from '../../src/types/profile'
import type { DayPlan } from '../../src/types/plan'

const MONDAY = '2026-10-05'
const SAT = '2026-10-10'

const CLUB_TUE_THU: ClubLite[] = [
  { weekday: 2, intensity: 'lourd', durationMin: 90 },
  { weekday: 4, intensity: 'normal', durationMin: 90 },
]

function input(overrides: Partial<BuildWeekInput> = {}): BuildWeekInput {
  return {
    weekStart: MONDAY,
    today: MONDAY,
    profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois' },
    clubDays: CLUB_TUE_THU,
    matches: [
      { date: '2026-10-03', time: null },
      { date: SAT, time: null },
    ],
    cycleIndex: 0,
    ...overrides,
  }
}

const sessions = (days: DayPlan[]) => days.flatMap((d) => (d.session ? [d.session] : []))
const muscu = (days: DayPlan[]) => sessions(days).filter((s) => s.kind === 'muscu')
const byDate = (days: DayPlan[], date: string) => days.find((d) => d.date === date)!

/** Vérifie les règles de placement sur une semaine, quel que soit le calendrier. */
function expectRules(days: DayPlan[], matches: { date: string }[]) {
  const matchDates = matches.map((m) => m.date)
  for (const day of days) {
    if (!day.session) continue
    const s = day.session
    const toNext = matchDates.filter((m) => m > day.date).map((m) => diffDays(day.date, m))
    const sincePrev = matchDates.filter((m) => m < day.date).map((m) => diffDays(m, day.date))
    const next = toNext.length ? Math.min(...toNext) : null
    const prev = sincePrev.length ? Math.min(...sincePrev) : null
    expect(matchDates, 'aucune séance un jour de match').not.toContain(day.date)
    expect(day.club?.intensity === 'lourd' && s.kind !== 'recuperation', `séance sur un club lourd le ${day.date}`).toBe(false)
    if (next === 1 && s.kind !== 'activation' && s.kind !== 'recuperation') throw new Error(`séance ${s.kind} à MD-1 le ${day.date}`)
    if (s.kind === 'activation') {
      expect(s.optional).toBe(true)
      expect(s.maxRpe ?? 0).toBeLessThanOrEqual(6)
    }
    if (s.slot === 'bas-force' || s.slot === 'puissance') {
      if (next !== null) expect(next, `bas du corps trop près du prochain match le ${day.date}`).toBeGreaterThanOrEqual(2)
      if (prev !== null) expect(prev, `bas du corps trop près du dernier match le ${day.date}`).toBeGreaterThanOrEqual(2)
    }
  }
}

describe('placement des séances, match samedi, club mardi lourd et jeudi normal', () => {
  const week = buildWeek(input())

  it('étiquette les jours MD±n', () => {
    expect(week.days.map((d) => d.mdLabel)).toEqual(['MD+2', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1'])
    expect(byDate(week.days, SAT).kind).toBe('match')
    expect(week.hasMatch).toBe(true)
  })

  it('place deux séances de musculation, hors veille de match et hors mardi lourd', () => {
    const m = muscu(week.days)
    expect(m).toHaveLength(2)
    expect(m.map((s) => s.date)).toEqual(['2026-10-05', '2026-10-07'])
    expect(byDate(week.days, '2026-10-06').session).toBeNull()
    expect(byDate(week.days, '2026-10-06').kind).toBe('club-lourd')
    expectRules(week.days, [{ date: SAT }])
  })

  it('met la force du bas du corps à MD-3 (mercredi) et le haut à MD+2 (lundi)', () => {
    expect(byDate(week.days, '2026-10-07').session?.slot).toBe('bas-force')
    expect(byDate(week.days, '2026-10-05').session?.slot).toBe('haut')
    expect(byDate(week.days, '2026-10-07').session?.reasons.some((r) => r.code === 'bas-48h')).toBe(true)
  })

  it('met la récupération à MD+1, une activation facultative à MD-1, et rien le jour du match', () => {
    expect(byDate(week.days, '2026-10-11').kind).toBe('recuperation')
    expect(byDate(week.days, '2026-10-11').session?.maxRpe).toBe(2)
    const friday = byDate(week.days, '2026-10-09')
    expect(friday.kind).toBe('activation')
    expect(friday.session?.optional).toBe(true)
    expect(byDate(week.days, SAT).session).toBeNull()
  })

  it('ajoute un rappel de vitesse dans une seule séance (le club n’en fait pas)', () => {
    const withSpeed = muscu(week.days).filter((s) => s.exercises.some((e) => e.block === 'vitesse'))
    expect(withSpeed).toHaveLength(1)
    expect(withSpeed[0]!.slot).toBe('bas-force')
    // Premier exercice après l'activation (bloc A) : le sprint, en bloc B.
    expect(withSpeed[0]!.exercises.find((e) => e.group !== 'A')!.block).toBe('vitesse')
  })

  it('reste déterministe', () => {
    expect(JSON.stringify(buildWeek(input()))).toBe(JSON.stringify(buildWeek(input())))
  })
})

describe('règles de placement sur de nombreux calendriers', () => {
  const experiences: LiftingExperience[] = ['moins-6-mois', '6-24-mois', 'plus-24-mois']
  const clubSets: ClubLite[][] = [
    [],
    CLUB_TUE_THU,
    [
      { weekday: 1, intensity: 'lourd', durationMin: 90 },
      { weekday: 3, intensity: 'lourd', durationMin: 90 },
      { weekday: 5, intensity: 'normal', durationMin: 60 },
    ],
    [2, 3, 4, 5].map((weekday) => ({ weekday: weekday as 2, intensity: 'lourd' as const, durationMin: 90 })),
    [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday: weekday as 1, intensity: 'normal' as const, durationMin: 60 })),
  ]

  it.each([1, 2, 3, 4, 5, 6, 7])('match le jour %i : aucune règle violée', (matchWeekday) => {
    const date = addDays(MONDAY, matchWeekday - 1)
    const matches = [
      { date: addDays(date, -7), time: null },
      { date, time: null },
      { date: addDays(date, 7), time: null },
    ]
    for (const liftingExperience of experiences) {
      for (const clubDays of clubSets) {
        const week = buildWeek(input({ matches, clubDays, profile: { position: 11, sex: 'homme', liftingExperience } }))
        expectRules(week.days, matches)
        expect(muscu(week.days).length).toBeLessThanOrEqual(2)
        expect(week.days).toHaveLength(7)
      }
    }
  })

  it('sans match, jamais de séance sur un club lourd et au plus 3 séances de musculation', () => {
    for (const liftingExperience of experiences) {
      for (const clubDays of clubSets) {
        const week = buildWeek(input({ matches: [], clubDays, profile: { position: 4, sex: 'homme', liftingExperience } }))
        expectRules(week.days, [])
        expect(muscu(week.days).length).toBeLessThanOrEqual(3)
      }
    }
  })
})

describe('semaine sans match', () => {
  const week = buildWeek(input({ matches: [], clubDays: CLUB_TUE_THU }))

  it('permet trois séances de musculation', () => {
    expect(week.hasMatch).toBe(false)
    expect(muscu(week.days)).toHaveLength(3)
    expect(week.days.every((d) => d.mdLabel === null)).toBe(true)
    expect(week.days.some((d) => d.kind === 'match')).toBe(false)
  })

  it('ajoute un conditionnement un autre jour que la force et la puissance (RC-5.4)', () => {
    const cond = sessions(week.days).filter((s) => s.kind === 'conditionnement')
    expect(cond).toHaveLength(1)
    const heavy = muscu(week.days).map((s) => s.date)
    expect(heavy).not.toContain(cond[0]!.date)
    expect(byDate(week.days, cond[0]!.date).club?.intensity).not.toBe('lourd')
    expectRules(week.days, [])
  })

  it('prévoit la récupération au lendemain d’un match de la semaine précédente', () => {
    const w = buildWeek(input({ matches: [{ date: addDays(MONDAY, -1), time: null }] }))
    expect(byDate(w.days, MONDAY).kind).toBe('recuperation')
    expect(w.hasMatch).toBe(false)
    expect(byDate(w.days, MONDAY).mdLabel).toBe('MD+1')
  })
})

describe('plus de 24 mois : force et puissance différenciées', () => {
  it('prévoit bas-force, haut et puissance en semaine sans match', () => {
    const week = buildWeek(input({ matches: [], profile: { position: 8, sex: 'homme', liftingExperience: 'plus-24-mois' } }))
    expect(muscu(week.days).map((s) => s.slot).sort()).toEqual(['bas-force', 'haut', 'puissance'])
  })
})

describe('débutant en musculation (moins de 6 mois)', () => {
  const week = buildWeek(input({ profile: { position: 3, sex: 'homme', liftingExperience: 'moins-6-mois' } }))

  it('prévoit deux séances complètes de corps entier, sans bas du corps lourd', () => {
    const m = muscu(week.days)
    expect(m).toHaveLength(2)
    expect(m.every((s) => s.slot === 'corps-entier')).toBe(true)
    expectRules(week.days, [{ date: SAT }])
  })

  it('plafonne tous les RPE cibles à 8, même sans match', () => {
    for (const w of [week, buildWeek(input({ matches: [], profile: { position: 3, sex: 'homme', liftingExperience: 'moins-6-mois' } }))]) {
      expect(muscu(w.days).length).toBeLessThanOrEqual(2)
      for (const s of sessions(w.days)) {
        for (const e of s.exercises) expect(e.prescription.targetRpe ?? 0).toBeLessThanOrEqual(8)
      }
    }
  })
})

describe('match déplacé en milieu de semaine', () => {
  const wednesday = '2026-10-07'
  const matches = [{ date: wednesday, time: null }]

  it('recalcule les étiquettes et respecte les 48 h', () => {
    const week = buildWeek(input({ matches }))
    expect(week.days.map((d) => d.mdLabel).slice(0, 5)).toEqual(['MD-2', 'MD-1', 'MD', 'MD+1', 'MD+2'])
    expectRules(week.days, matches)
    expect(byDate(week.days, '2026-10-06').session?.kind).not.toBe('muscu')
    expect(byDate(week.days, '2026-10-08').kind).toBe('club-normal')
  })

  it('régénère seulement les jours restants et conserve la séance faite', () => {
    const original = buildWeek(input({ matches: [{ date: SAT, time: null }] }))
    const monday = byDate(original.days, MONDAY)
    const done = { ...monday, session: { ...monday.session!, status: 'faite' as const, logId: 'log-1' } }
    const regenerated = buildWeek(input({ matches, today: '2026-10-06', locked: [done] }))
    expect(byDate(regenerated.days, MONDAY)).toEqual({ ...done, locked: true })
    // Le lundi (passé) n'est plus recalculé : le reste de la semaine est reconstruit autour du nouveau match.
    expect(byDate(regenerated.days, '2026-10-06').session).toBeNull()
    expect(byDate(regenerated.days, wednesday).kind).toBe('match')
    const remaining = muscu(regenerated.days).filter((s) => s.date >= '2026-10-06')
    expect(remaining.length).toBe(1) // 2 séances visées − 1 déjà faite
    expect(remaining[0]!.slot).toBe('bas-force') // le haut du corps est déjà fait
    expectRules(regenerated.days.filter((d) => d.date >= '2026-10-06'), matches)
  })

  it("ne place rien avant aujourd'hui sans plan existant", () => {
    const week = buildWeek(input({ today: '2026-10-08', matches: [{ date: SAT, time: null }] }))
    for (const d of week.days.filter((x) => x.date < '2026-10-08')) {
      expect(d.session).toBeNull()
      expect(d.locked).toBe(true)
    }
    expect(muscu(week.days).every((s) => s.date >= '2026-10-08')).toBe(true)
  })
})

describe('cas limites de placement', () => {
  it('club lourd tous les jours sauf MD-1 et MD+1 : pas de bas du corps lourd, pas de séance intense', () => {
    const clubDays: ClubLite[] = [1, 2, 3, 4].map((weekday) => ({ weekday: weekday as 1, intensity: 'lourd' as const, durationMin: 90 }))
    const week = buildWeek(input({ clubDays }))
    expect(muscu(week.days)).toHaveLength(0)
    expectRules(week.days, [{ date: SAT }])
  })

  it('sans créneau à 48 h, remplace le bas du corps par du haut du corps', () => {
    // Match mercredi : seuls lundi (MD-2, 48 h) et vendredi (MD+2) sont éloignés ; on bloque les deux en club lourd.
    const clubDays: ClubLite[] = [1, 5, 6, 7].map((weekday) => ({ weekday: weekday as 1, intensity: 'lourd' as const, durationMin: 90 }))
    const matches = [{ date: '2026-10-07', time: null }]
    const week = buildWeek(input({ matches, clubDays }))
    expect(muscu(week.days).filter((s) => s.slot === 'bas-force')).toHaveLength(0)
    expectRules(week.days, matches)
  })

  it('autorise une séance sur un club normal quand aucun autre jour n’est libre', () => {
    const clubDays: ClubLite[] = [1, 2, 3, 4, 5].map((weekday) => ({ weekday: weekday as 1, intensity: 'normal' as const, durationMin: 60 }))
    const week = buildWeek(input({ matches: [], clubDays }))
    expect(muscu(week.days).length).toBeGreaterThan(0)
    expect(sessions(week.days).some((s) => s.reasons.some((r) => r.code === 'jour-club'))).toBe(true)
  })

  it('signale deux matchs à moins de 72 h sans adapter le plan', () => {
    const week = buildWeek(input({ matches: [{ date: SAT, time: null }, { date: '2026-10-12', time: null }] }))
    expect(week.flags.map((f) => f.code)).toEqual(['matchs-rapproches'])
    expectRules(week.days, [{ date: SAT }, { date: '2026-10-12' }])
  })
})

describe('semaine allégée (RC-5.3)', () => {
  const total = (days: DayPlan[]) =>
    muscu(days).reduce((n, s) => n + s.exercises.reduce((m, e) => m + e.prescription.sets, 0), 0)

  it('allège la 5e semaine du cycle : moins de séries et raison explicite', () => {
    const normal = buildWeek(input({ cycleIndex: 3 }))
    const light = buildWeek(input({ cycleIndex: 4 }))
    expect(normal.isDeload).toBe(false)
    expect(light.isDeload).toBe(true)
    expect(total(light.days)).toBeLessThan(total(normal.days) * 0.75)
    expect(muscu(light.days).every((s) => s.deload && s.reasons.some((r) => r.code === 'deload'))).toBe(true)
    expect(buildWeek(input({ cycleIndex: 9 })).isDeload).toBe(true)
  })

  it('peut être imposée par le contexte', () => {
    expect(buildWeek(input({ cycleIndex: 1, context: { forceDeload: true } })).isDeload).toBe(true)
  })
})

describe('points d’extension (PlanContext)', () => {
  it('suspend le plan : aucune séance, raison sur les jours', () => {
    const week = buildWeek(input({ context: { suspended: true } }))
    expect(sessions(week.days)).toHaveLength(0)
    expect(byDate(week.days, '2026-10-07').reasons.map((r) => r.code)).toContain('plan-suspendu')
  })

  it('autorise une 3e séance avec match quand le joueur n’a pas joué', () => {
    expect(muscu(buildWeek(input({ context: { extraMuscuSession: true } })).days).length).toBe(3)
    expect(muscu(buildWeek(input({ context: { extraMuscuSession: true, maxMuscuSessions: 1 } })).days).length).toBe(1)
  })

  it('réduit le volume, exclut des exercices et ajoute les raisons des phases', () => {
    const base = buildWeek(input())
    const ctx = mergeContexts([
      { volumeFactor: 0.7, reasons: [{ code: 'fatigue', text: 'Allégée : fatigue élevée.', source: 'ressenti' }] },
      { excludedExerciseIds: ['back-squat'] },
    ])
    const week = buildWeek(input({ context: ctx }))
    const sets = (d: DayPlan[]) => muscu(d).reduce((n, s) => n + s.exercises.reduce((m, e) => m + e.prescription.sets, 0), 0)
    expect(sets(week.days)).toBeLessThan(sets(base.days))
    expect(muscu(week.days).flatMap((s) => s.exercises).map((e) => e.exerciseId)).not.toContain('back-squat')
    expect(muscu(week.days).every((s) => s.reasons.some((r) => r.code === 'fatigue'))).toBe(true)
  })

  it('fusionne les contextes de façon prudente', () => {
    const merged = mergeContexts([{ volumeFactor: 0.8, maxMuscuSessions: 2 }, { volumeFactor: 0.6, maxMuscuSessions: 1, suspended: true }])
    expect(merged).toEqual({ volumeFactor: 0.6, maxMuscuSessions: 1, suspended: true })
  })
})

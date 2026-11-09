import { describe, expect, it } from 'vitest'
import { addDays } from '../../src/engine/dates'
import { programWeek, offseasonEnd, defaultStartMonday } from '../../src/engine/season'
import { buildWeek, type BuildWeekInput } from '../../src/engine/week-builder/buildWeek'
import type { DayPlan, PlanProfile, PrescribedExercise, Session } from '../../src/types/plan'

const START = '2026-10-05'
const PHASE = { kind: 'intersaison' as const, startMonday: START }

function weekInput(week: number, profile: Partial<PlanProfile> = {}, overrides: Partial<BuildWeekInput> = {}): BuildWeekInput {
  const weekStart = addDays(START, (week - 1) * 7)
  return {
    weekStart,
    today: weekStart,
    profile: { position: 7, sex: 'homme', liftingExperience: '6-24-mois', programWeek: week, ...profile },
    clubDays: [{ weekday: 2, intensity: 'lourd', durationMin: 90 }],
    matches: [],
    cycleIndex: 4,
    ...overrides,
  }
}

const sessionOf = (days: DayPlan[], slot: string): Session => days.find((d) => d.session?.slot === slot)!.session!
const ex = (s: Session, id: string): PrescribedExercise | undefined => s.exercises.find((e) => e.exerciseId === id)

describe('semaine du programme', () => {
  it('lundi 2026-10-05 : semaine 3 le 2026-10-19, retour en saison le 2026-12-07', () => {
    expect(programWeek(PHASE, '2026-10-05')).toBe(1)
    expect(programWeek(PHASE, '2026-10-19')).toBe(3)
    expect(programWeek(PHASE, '2026-11-30')).toBe(9)
    expect(programWeek(PHASE, '2026-12-07')).toBeNull()
    expect(programWeek(PHASE, '2026-09-28')).toBeNull()
    expect(programWeek({ kind: 'saison' }, '2026-10-19')).toBeNull()
    expect(programWeek(undefined, '2026-10-19')).toBeNull()
    expect(offseasonEnd(START)).toBe('2026-12-06')
  })

  it('propose le lundi courant ou le suivant', () => {
    expect(defaultStartMonday('2026-10-05')).toBe('2026-10-05')
    expect(defaultStartMonday('2026-10-07')).toBe('2026-10-12')
  })
})

describe('semaine type ATP', () => {
  it('S2 : les 7 séances aux bons jours, jeudi et dimanche facultatifs, pas de décharge', () => {
    const built = buildWeek(weekInput(2))
    expect(built.isDeload).toBe(false)
    expect(built.days.map((d) => d.session?.slot)).toEqual(['atp-lower', 'atp-upper', 'atp-conditioning', 'atp-accessoire', 'atp-terrain', 'atp-full', 'atp-recup'])
    expect(built.days.map((d) => d.session?.optional)).toEqual([false, false, false, true, false, false, true])
    for (const d of built.days) expect(d.session?.deload).toBe(false)
    // Club du mardi ignoré, avec sa raison.
    expect(built.days[1]!.reasons.map((r) => r.code)).toContain('intersaison-club')
    expect(built.days[0]!.session!.reasons.map((r) => r.text)).toContain('Intersaison · semaine 2 sur 9 (méthode ATP).')
  })

  it('S2 : squat, développé couché et soulevé de terre en 5 × 5 à 80-85 %', () => {
    const days = buildWeek(weekInput(2)).days
    for (const [slot, id] of [['atp-lower', 'back-squat'], ['atp-upper', 'bench-press'], ['atp-full', 'deadlift']] as const) {
      const e = ex(sessionOf(days, slot), id)!
      expect(e.group).toBe('C')
      expect(e.prescription).toMatchObject({ sets: 5, reps: 5, pctOneRm: [0.8, 0.85] })
    }
  })

  it('S4 : vague 6-4-2-4-6 et AMRAP de 3 min avec 2 min de récupération', () => {
    const days = buildWeek(weekInput(4)).days
    const squat = ex(sessionOf(days, 'atp-lower'), 'back-squat')!
    expect(squat.prescription.waves?.map((w) => w.reps)).toEqual([6, 4, 2, 4, 6])
    expect(squat.prescription.sets).toBe(5)
    const amrap = ex(sessionOf(days, 'atp-conditioning'), 'amrap-shuttles-burpees')!
    expect(amrap.prescription).toMatchObject({ sets: 4, reps: 3, unit: 'min' })
    expect(amrap.restSec).toEqual([120, 120])
  })

  it('S7 : top set de 3 puis 3 à 5 séries de 3 à 87-92 %', () => {
    const squat = ex(sessionOf(buildWeek(weekInput(7)).days, 'atp-lower'), 'back-squat')!
    const waves = squat.prescription.waves!
    expect(waves[0]).toMatchObject({ reps: 3, toMax: true })
    expect(waves.length - 1).toBeGreaterThanOrEqual(3)
    expect(waves.length - 1).toBeLessThanOrEqual(5)
    for (const w of waves.slice(1)) expect(w).toMatchObject({ reps: 3, pctTopSet: [0.87, 0.92] })
  })

  it('S1 et S9 : séances de tests aux mêmes jours, re-test au même nombre de reps', () => {
    const s1 = buildWeek(weekInput(1)).days
    const s9 = buildWeek(weekInput(9, { testReps: { squat: 3 } })).days
    for (const days of [s1, s9]) {
      expect(sessionOf(days, 'atp-lower').tests).toContain('squat')
      expect(sessionOf(days, 'atp-upper').tests).toContain('developpe-couche')
      expect(sessionOf(days, 'atp-conditioning').tests).toEqual(['bronco'])
      expect(sessionOf(days, 'atp-terrain').tests).toEqual(['broad-jump', 'saut-lateral-gauche', 'saut-lateral-droite', 't-test'])
      expect(sessionOf(days, 'atp-full').tests).toContain('souleve-de-terre')
    }
    expect(ex(sessionOf(s9, 'atp-lower'), 'back-squat')!.prescription.reps).toBe(3)
    expect(ex(sessionOf(s9, 'atp-upper'), 'bench-press')!.prescription.reps).toBe(5)
  })

  it('S1 à S9 : aucune semaine allégée', () => {
    for (let w = 1; w <= 9; w++) {
      const built = buildWeek(weekInput(w, {}, { cycleIndex: 4 }))
      expect(built.isDeload, `S${w}`).toBe(false)
      expect(built.days.filter((d) => d.session).length, `S${w}`).toBe(7)
    }
  })

  it('F facultatif sur la séance lower', () => {
    const lower = sessionOf(buildWeek(weekInput(3)).days, 'atp-lower')
    const f = lower.exercises.filter((e) => e.group === 'F')
    expect(f.length).toBeGreaterThan(0)
    expect(f.every((e) => e.optional)).toBe(true)
  })
})

describe('avants, arrières, niveaux', () => {
  it('poste 1 en S2 : conditioning à 3 séries au lieu de 4, renfo full body cou + rowing', () => {
    const days = buildWeek(weekInput(2, { position: 1 })).days
    expect(ex(sessionOf(days, 'atp-conditioning'), 'shuttle-burpee-pyramid')!.prescription.sets).toBe(3)
    const full = sessionOf(days, 'atp-full')
    expect(ex(full, 'neck-iso-row')).toBeDefined()
    expect(ex(full, 'pull-up-weighted')).toBeUndefined()
    const back = buildWeek(weekInput(2, { position: 12 })).days
    expect(ex(sessionOf(back, 'atp-conditioning'), 'shuttle-burpee-pyramid')!.prescription.sets).toBe(4)
  })

  it('poste 12 en S4 : tractions lestées 4-8 et puissance légère et explosive', () => {
    const days = buildWeek(weekInput(4, { position: 12 })).days
    const full = sessionOf(days, 'atp-full')
    expect(ex(full, 'pull-up-weighted')!.prescription).toMatchObject({ reps: 4, repsMax: 8 })
    expect(ex(full, 'landmine-lateral-step')).toBeDefined()
    expect(ex(full, 'clean-fend-split-jump')).toBeUndefined()
    expect(ex(sessionOf(days, 'atp-lower'), 'drop-jump-broad-jump')).toBeDefined()
  })

  it('moins de 6 mois : test 5RM seulement, pas de série au max, RPE plafonné à 8, pas de finisher', () => {
    const p = { liftingExperience: 'moins-6-mois' as const }
    const s1 = buildWeek(weekInput(1, p)).days
    expect(ex(sessionOf(s1, 'atp-lower'), 'back-squat')!.prescription.reps).toBe(5)
    for (const w of [4, 5, 6, 7, 8]) {
      const days = buildWeek(weekInput(w, p)).days
      const squat = ex(sessionOf(days, 'atp-lower'), 'back-squat')!
      expect(squat.prescription.waves!.some((x) => x.toMax), `S${w}`).toBe(false)
      for (const d of days) {
        for (const e of d.session?.exercises ?? []) {
          expect(e.prescription.targetRpe ?? 0, `${e.exerciseId} S${w}`).toBeLessThanOrEqual(8)
          expect(e.group === 'F' && e.optional && e.block === 'finisher', e.exerciseId).toBe(false)
        }
      }
    }
  })
})

describe('cas particuliers', () => {
  it('match le samedi de la S3 : semaine en logique saison, raison affichée', () => {
    const inp = weekInput(3, {}, { matches: [{ date: addDays(START, 14 + 5), time: null }] })
    const built = buildWeek(inp)
    expect(built.hasMatch).toBe(true)
    expect(built.days.some((d) => d.session?.slot.startsWith('atp-'))).toBe(false)
    const withSession = built.days.find((d) => d.session)!
    expect(withSession.reasons.map((r) => r.code)).toContain('intersaison-match')
  })

  it('après la S9 : semaine en saison, décharge reprise selon le cycle', () => {
    const built = buildWeek({ ...weekInput(10), profile: { position: 7, sex: 'homme', liftingExperience: '6-24-mois', programWeek: null }, cycleIndex: 0 })
    expect(built.days.some((d) => d.session?.slot.startsWith('atp-'))).toBe(false)
    expect(built.days.some((d) => d.session?.kind === 'muscu')).toBe(true)
  })

  it('genou déclaré en S5 : sauts et squat retirés ou remplacés', () => {
    const days = buildWeek(weekInput(5, {}, { context: { injuryZones: ['genou'] } })).days
    const lower = sessionOf(days, 'atp-lower')
    expect(ex(lower, 'back-squat')).toBeUndefined()
    expect(ex(lower, 'drop-lunge-split-jump')).toBeUndefined()
    expect(lower.reasons.map((r) => r.code)).toContain('blessure-adaptation')
    // Les remplaçants gardent leur lettre de bloc.
    for (const e of lower.exercises) expect(e.group).toBeDefined()
  })

  it('plan suspendu : aucune séance', () => {
    const built = buildWeek(weekInput(5, {}, { context: { suspended: true } }))
    expect(built.days.every((d) => d.session === null)).toBe(true)
  })

  it('jours passés non régénérés', () => {
    const inp = weekInput(2)
    const built = buildWeek({ ...inp, today: addDays(inp.weekStart, 2) })
    expect(built.days[0]!.session).toBeNull()
    expect(built.days[0]!.locked).toBe(true)
    expect(built.days[2]!.session?.slot).toBe('atp-conditioning')
  })
})

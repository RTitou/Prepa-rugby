import { describe, expect, it } from 'vitest'
import { adaptWarmupSteps, applyInjuriesToWarmup } from '../../src/engine/injuries/adaptWarmup'
import { buildWeek, type BuildWeekInput } from '../../src/engine/week-builder/buildWeek'
import { ACTIVATE_FULL, ACTIVATE_SHORT } from '../../src/reference/activate/warmup'
import { getExercise } from '../../src/reference/exercises/library'
import { isExcludedByZones } from '../../src/reference/substitutions/table'
import type { Session } from '../../src/types/plan'
import { BODY_ZONES, type BodyZone } from '../../src/types/reference'

const MONDAY = '2026-10-05'
const ZONES = BODY_ZONES.map((z) => z.value)

function week(zones: BodyZone[]): Session[] {
  const input: BuildWeekInput = {
    weekStart: MONDAY,
    today: MONDAY,
    profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois' },
    clubDays: [
      { weekday: 2, intensity: 'lourd', durationMin: 90 },
      { weekday: 4, intensity: 'normal', durationMin: 90 },
    ],
    matches: [{ date: '2026-10-10', time: null }],
    cycleIndex: 0,
    context: { injuryZones: zones },
  }
  return buildWeek(input).days.flatMap((d) => (d.session ? [d.session] : []))
}

describe('échauffement et blessures', () => {
  it('genou actif : aucun exercice d’échauffement ne sollicite le genou ni n’est exclu', () => {
    const sessions = week(['genou'])
    expect(sessions.length).toBeGreaterThan(0)
    for (const s of sessions) {
      expect(s.warmup.steps, s.id).toBeDefined()
      expect(s.reasons.some((r) => r.code === 'blessure-echauffement')).toBe(true)
      for (const step of s.warmup.steps!) {
        for (const id of step.exerciseIds) {
          const ex = getExercise(id)!
          expect(ex.zones).not.toContain('genou')
          expect(isExcludedByZones(['genou'], ex), id).toBe(false)
        }
      }
    }
  })

  it('sans blessure, l’échauffement standard est conservé', () => {
    for (const s of week([])) {
      expect(s.warmup.steps).toBeUndefined()
      expect(s.reasons.some((r) => r.code === 'blessure-echauffement')).toBe(false)
    }
  })

  it('propriété sur les 10 zones : jamais d’exercice exclu, jamais d’étape vide, durée cohérente', () => {
    for (const zone of ZONES) {
      for (const programme of [ACTIVATE_FULL, ACTIVATE_SHORT]) {
        const { steps } = adaptWarmupSteps(programme.steps, [zone])
        for (const step of steps) {
          expect(step.exerciseIds.length, `${zone}/${step.id}`).toBeGreaterThan(0)
          for (const id of step.exerciseIds) expect(isExcludedByZones([zone], getExercise(id)!), `${zone}/${id}`).toBe(false)
        }
      }
      for (const s of week([zone])) {
        if (s.warmup.steps) {
          expect(s.warmup.durationMin).toBe(s.warmup.steps.reduce((n, st) => n + st.durationMin, 0))
          for (const step of s.warmup.steps) {
            for (const id of step.exerciseIds) expect(isExcludedByZones([zone], getExercise(id)!), `${zone}/${id}`).toBe(false)
          }
        }
      }
    }
  })

  it('une zone en vigilance (painZones) retire seulement les impacts forts', () => {
    const base = week([])[0]!
    expect(applyInjuriesToWarmup(base, [], ['genou'])).toBe(base)
  })

  it('les gammes de course sollicitent le genou', () => {
    expect(getExercise('running-drills')!.zones).toContain('genou')
  })
})

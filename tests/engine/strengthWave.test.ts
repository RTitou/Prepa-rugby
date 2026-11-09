import { describe, expect, it } from 'vitest'
import { seasonWaveWeek } from '../../src/engine/progression/strengthWave'
import { composeSession, type ComposeInput } from '../../src/engine/week-builder/composeSession'
import { buildWeek } from '../../src/engine/week-builder/buildWeek'
import { isScheduledDeload } from '../../src/engine/progression/deload'
import type { BlockLetter, PrescribedExercise, Session } from '../../src/types/plan'

function make(overrides: Partial<ComposeInput> = {}): ComposeInput {
  return {
    date: '2026-10-07',
    slot: 'bas-force',
    index: 0,
    profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois' },
    rotation: 41,
    deload: false,
    includeSpeed: false,
    ...overrides,
  }
}

const block = (s: Session, letter: BlockLetter): PrescribedExercise[] => s.exercises.filter((e) => e.group === letter)
const order: Record<BlockLetter, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 }

describe('vague de force en saison', () => {
  it('suit le cycle de 5 semaines : 1, 2, 3, 4 puis décharge', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map((i) => seasonWaveWeek(i, false))).toEqual([1, 2, 3, 4, 'decharge', 1, 'decharge'])
    expect(seasonWaveWeek(1, true)).toBe('decharge')
    for (let i = 0; i < 10; i++) expect(seasonWaveWeek(i, false) === 'decharge').toBe(isScheduledDeload(i))
  })

  it('sur 5 semaines consécutives, le bloc C suit 4 × 5, 6-4-2, 5-3-1, top set + back-off, puis décharge', () => {
    const c = (cycleIndex: number) =>
      block(composeSession(make({ cycleIndex, deload: isScheduledDeload(cycleIndex) })), 'C')[0]!.prescription
    expect(c(0)).toMatchObject({ sets: 4, reps: 5, pctOneRm: [0.78, 0.82] })
    expect(c(1).waves!.map((w) => w.reps)).toEqual([6, 4, 2])
    expect(c(2).waves!.map((w) => w.reps)).toEqual([5, 3, 1])
    expect(c(3).waves![0]).toMatchObject({ reps: 3, toMax: true })
    expect(c(3).waves!.slice(1).every((w) => w.pctTopSet !== undefined)).toBe(true)
    expect(c(4)).toMatchObject({ sets: 3, reps: 5, pctOneRm: [0.7, 0.7] })
  })
})

describe('séance de musculation en blocs ATP', () => {
  it('blocs A, B, C, D, E dans l’ordre, un seul mouvement roi en C, F facultatif hors durée obligatoire', () => {
    const s = composeSession(make({ profile: { position: 14, sex: 'homme', liftingExperience: 'plus-24-mois' } }))
    const letters = s.exercises.map((e) => e.group!)
    expect(letters.every(Boolean)).toBe(true)
    for (let i = 1; i < letters.length; i++) expect(order[letters[i]!]).toBeGreaterThanOrEqual(order[letters[i - 1]!])
    for (const l of ['A', 'B', 'C', 'D', 'E'] as const) expect(block(s, l).length, l).toBeGreaterThan(0)
    expect(block(s, 'C')).toHaveLength(1)
    expect(block(s, 'D').length).toBeGreaterThanOrEqual(2)
    expect(block(s, 'D').length).toBeLessThanOrEqual(3)
    const f = block(s, 'F')
    expect(f.length).toBeGreaterThan(0)
    expect(f.every((e) => e.optional)).toBe(true)
    // La durée ne change pas avec ou sans finisher.
    const withoutF = composeSession(make({ profile: { position: 14, sex: 'homme', liftingExperience: 'plus-24-mois' }, toNextMatch: 2 }))
    expect(block(withoutF, 'F')).toHaveLength(0)
    expect(withoutF.durationMin).toBe(s.durationMin)
  })

  it('à MD-2 : ni série au max ni finisher', () => {
    for (const cycleIndex of [1, 2, 3]) {
      const s = composeSession(make({ slot: 'haut', cycleIndex, toNextMatch: 2 }))
      expect(block(s, 'C')[0]!.prescription.waves!.some((w) => w.toMax)).toBe(false)
      expect(block(s, 'F')).toHaveLength(0)
    }
  })

  it('volume réduit par le contexte : séries réduites aussi sur les vagues', () => {
    const normal = block(composeSession(make({ cycleIndex: 1 })), 'C')[0]!
    const reduced = block(composeSession(make({ cycleIndex: 1, context: { volumeFactor: 0.6 } })), 'C')[0]!
    expect(reduced.prescription.waves!.length).toBeLessThan(normal.prescription.waves!.length)
    expect(reduced.prescription.sets).toBe(reduced.prescription.waves!.length)
  })

  it('le placement reste celui d’avant : bas du corps à MD-3, haut du corps à MD+2', () => {
    const week = buildWeek({
      weekStart: '2026-10-05',
      today: '2026-10-05',
      profile: { position: 9, sex: 'homme', liftingExperience: '6-24-mois' },
      clubDays: [
        { weekday: 2, intensity: 'lourd', durationMin: 90 },
        { weekday: 4, intensity: 'normal', durationMin: 90 },
      ],
      matches: [
        { date: '2026-10-03', time: null },
        { date: '2026-10-10', time: null },
      ],
      cycleIndex: 1,
    })
    const lower = week.days.find((d) => d.session?.slot === 'bas-force')!
    expect(lower.mdLabel).toBe('MD-3')
    expect(lower.session!.exercises.find((e) => e.group === 'C')!.prescription.waves!.map((w) => w.reps)).toEqual([6, 4, 2])
    const upper = week.days.find((d) => d.session?.slot === 'haut')!
    expect(upper.mdLabel).toBe('MD+2')
  })
})

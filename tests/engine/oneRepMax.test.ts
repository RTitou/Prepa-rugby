import { describe, expect, it } from 'vitest'
import { convertOneRepMax, estimateOneRepMax, isImpreciseEstimate, recordOneRepMax } from '../../src/engine/progression/oneRepMax'

describe('1RM estimé (Epley, RC-3.4)', () => {
  it('applique charge × (1 + reps / 30)', () => {
    expect(estimateOneRepMax(130, 5)).toBeCloseTo(151.667, 3)
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.333, 3)
    expect(estimateOneRepMax(100, 3)).toBeCloseTo(110, 6)
  })

  it('une seule répétition donne la charge elle-même', () => {
    expect(estimateOneRepMax(120, 1)).toBe(120)
  })

  it('refuse une charge ou des répétitions invalides', () => {
    expect(() => estimateOneRepMax(0, 5)).toThrow()
    expect(() => estimateOneRepMax(100, 0)).toThrow()
    expect(() => estimateOneRepMax(100, 2.5)).toThrow()
  })

  it('signale l’imprécision au-delà de 10 répétitions', () => {
    expect(isImpreciseEstimate(10)).toBe(false)
    expect(isImpreciseEstimate(11)).toBe(true)
  })

  it('convertit vers le protocole du repère : 3RM ≈ 0,91 × 1RM', () => {
    expect(convertOneRepMax(100, '1RM')).toBe(100)
    expect(convertOneRepMax(100, '3RM')).toBeCloseTo(91, 6)
    expect(convertOneRepMax(100, null)).toBeNull()
  })

  it('le 1RM d’un record ne concerne que les charges', () => {
    expect(recordOneRepMax({ test: 'squat', unit: 'kg', value: 100, reps: 5 })).toBeCloseTo(116.667, 3)
    expect(recordOneRepMax({ test: 'sprint-10m', unit: 's', value: 1.8, reps: null })).toBeNull()
    expect(recordOneRepMax({ test: 'poids', unit: 'kg', value: 82, reps: null })).toBeNull()
  })
})

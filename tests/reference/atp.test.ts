import { describe, expect, it } from 'vitest'
import { getExercise } from '../../src/reference/exercises/library'
import { ATP_LIFTS, offseasonStrength, seasonStrength } from '../../src/reference/atp/strength'
import { ATP_WEEK, atpBlocks } from '../../src/reference/atp/sessions'
import { getSource } from '../../src/reference/sources'
import { atpOneRepMax } from '../../src/engine/progression/oneRepMax'
import { buildPlayerMaxes, suggestLoad, suggestSetLoad } from '../../src/engine/progression/suggestedLoad'
import { getRecordTest } from '../../src/types/records'
import type { PerformanceRecord } from '../../src/types/records'

const LIFTS = ['squat', 'developpe-couche', 'souleve-de-terre'] as const

describe('référentiel ATP', () => {
  it('cite la source ATP (niveau C)', () => {
    expect(getSource('atp-beast-off-season')?.evidence).toBe('C')
  })

  it('chaque exercice cité existe dans la bibliothèque avec au moins une zone', () => {
    for (let week = 1; week <= 9; week++) {
      for (const day of ATP_WEEK) {
        for (const block of atpBlocks(day, week)) {
          for (const item of block.items) {
            const ex = getExercise(item.id)
            expect(ex, `${day} S${week} ${block.letter} : ${item.id}`).toBeDefined()
            expect(ex!.zones.length, item.id).toBeGreaterThan(0)
          }
        }
      }
    }
    for (const lift of Object.values(ATP_LIFTS)) expect(getExercise(lift.exerciseId)).toBeDefined()
  })

  it('donne le schéma de force de chaque semaine, identique pour les trois mouvements (sauf le back-off du DC en S8)', () => {
    for (const lift of LIFTS) {
      expect(offseasonStrength(1, lift, '6-24-mois').scheme.kind).toBe('test')
      expect(offseasonStrength(9, lift, '6-24-mois').scheme.kind).toBe('test')
      for (const w of [2, 3]) expect(offseasonStrength(w, lift, '6-24-mois').scheme).toEqual({ kind: 'sets', sets: 5, reps: 5, pct: [0.8, 0.85] })
    }
    const s4 = offseasonStrength(4, 'squat', '6-24-mois').scheme
    expect(s4.kind === 'wave' && s4.waves.map((w) => w.reps)).toEqual([6, 4, 2, 4, 6])
    expect(s4.kind === 'wave' && s4.waves[2]!.toMax).toBe(true)
    const s5 = offseasonStrength(5, 'squat', '6-24-mois').scheme
    expect(s5.kind === 'wave' && s5.waves[1]!.pctOneRm).toEqual([0.82, 0.87])
    const s6 = offseasonStrength(6, 'souleve-de-terre', '6-24-mois').scheme
    expect(s6.kind === 'wave' && s6.waves.map((w) => w.reps)).toEqual([5, 3, 1, 3, 5])
    const s7 = offseasonStrength(7, 'squat', '6-24-mois').scheme
    expect(s7.kind === 'wave' && s7.waves[0]!.toMax).toBe(true)
    expect(s7.kind === 'wave' && s7.waves.slice(1).every((w) => w.reps === 3 && w.pctTopSet?.[0] === 0.87)).toBe(true)
    const s8bench = offseasonStrength(8, 'developpe-couche', '6-24-mois').scheme
    expect(s8bench.kind === 'wave' && s8bench.waves[1]!.pctTopSet?.[0]).toBe(0.89)
  })

  it('donne la vague en saison sur 4 semaines puis la décharge', () => {
    expect(seasonStrength(1, '6-24-mois').scheme).toEqual({ kind: 'sets', sets: 4, reps: 5, pct: [0.78, 0.82] })
    const w2 = seasonStrength(2, '6-24-mois').scheme
    expect(w2.kind === 'wave' && w2.waves.map((w) => w.reps)).toEqual([6, 4, 2])
    const w3 = seasonStrength(3, '6-24-mois').scheme
    expect(w3.kind === 'wave' && w3.waves.map((w) => w.reps)).toEqual([5, 3, 1])
    const w4 = seasonStrength(4, '6-24-mois').scheme
    expect(w4.kind === 'wave' && w4.waves[0]!.toMax).toBe(true)
    expect(seasonStrength('decharge', '6-24-mois').scheme).toEqual({ kind: 'sets', sets: 3, reps: 5, pct: [0.7, 0.7] })
  })

  it('donne le format de conditioning de chaque semaine', () => {
    const main = (w: number) => atpBlocks('conditioning', w).find((b) => b.letter === 'B')!
    expect(main(1).tests).toEqual(['bronco'])
    expect(main(9).tests).toEqual(['bronco'])
    expect(main(2).items[0]!.id).toBe('shuttle-burpee-pyramid')
    expect(main(2).items[0]!.setsTight5).toBe(3)
    expect(main(3).items[0]!.id).toBe('every-30s-shuttles')
    expect(main(4).items[0]).toMatchObject({ id: 'amrap-shuttles-burpees', sets: 4, reps: 3, unit: 'min' })
    expect(main(4).restSec).toEqual([120, 120])
    expect(main(5).items[0]!.reps).toBe(4)
    expect(main(6).items[0]!.reps).toBe(5)
    expect(main(7).items[0]!.reps).toBe(6)
    expect(main(7).restSec).toEqual([180, 180])
  })

  it('donne le contenu terrain de chaque semaine', () => {
    const ids = (w: number) => atpBlocks('terrain', w).flatMap((b) => b.items.map((i) => i.id))
    expect(ids(1)).toEqual(expect.arrayContaining(['broad-jump-test', 'lateral-hop-test', 't-test-drill']))
    expect(ids(9)).toEqual(expect.arrayContaining(['broad-jump-test', 'lateral-hop-test', 't-test-drill']))
    expect(ids(2)).toEqual(expect.arrayContaining(['triangle-cod', 'linear-sprint-ladder']))
    expect(ids(5)).toContain('multidirectional-sprint-45-90')
    const sprint6 = atpBlocks('terrain', 6).flatMap((b) => b.items).find((i) => i.id === 'multidirectional-sprint-45-90')
    expect(sprint6?.sets).toBe(8)
    expect(ids(8)).toContain('multidirectional-sprint-90')
  })

  it('le finisher de salle est facultatif', () => {
    const f = atpBlocks('lower', 4).find((b) => b.letter === 'F')
    expect(f?.optional).toBe(true)
  })
})

describe('nouveaux tests de records', () => {
  it('le broad jump est en cm, plus haut = mieux, et le T-test en secondes', () => {
    expect(getRecordTest('broad-jump')).toMatchObject({ kind: 'distance', unit: 'cm' })
    expect(getRecordTest('saut-lateral-gauche').unit).toBe('cm')
    expect(getRecordTest('t-test')).toMatchObject({ kind: 'time', unit: 's' })
    expect(getRecordTest('souleve-de-terre')).toMatchObject({ kind: 'load', unit: 'kg' })
  })
})

describe('charges en % du 1RM', () => {
  const rec = (test: PerformanceRecord['test'], value: number, reps: number): PerformanceRecord => ({
    id: test,
    test,
    value,
    unit: 'kg',
    reps,
    date: '2026-10-01',
    updatedAt: '2026-10-01T00:00:00.000Z',
    deletedAt: null,
  })

  it('3RM de 100 kg : 1RM ATP de 111 kg ; 5RM de 100 kg : 119 kg', () => {
    expect(Math.round(atpOneRepMax(100, 3))).toBe(111)
    expect(Math.round(atpOneRepMax(100, 5))).toBe(119)
    expect(atpOneRepMax(120, 1)).toBe(120)
  })

  it('5 × 5 à 80-85 % avec un 1RM de 120 kg : 97,5 kg', () => {
    const maxes = buildPlayerMaxes([rec('squat', 120, 1)], [], '2026-10-10')
    const load = suggestLoad('back-squat', { sets: 5, reps: 5, unit: 'reps', targetRpe: 9, pctOneRm: [0.8, 0.85] }, maxes)
    expect(load?.kg).toBe(97.5)
    expect(load?.basis).toContain('squat')
  })

  it('une série au max n’impose aucun kg ; un back-off suit le top set saisi', () => {
    const maxes = buildPlayerMaxes([rec('squat', 120, 1)], [], '2026-10-10')
    const p = {
      sets: 3,
      reps: 3,
      unit: 'reps' as const,
      targetRpe: 9,
      waves: [
        { reps: 3, pctOneRm: null, toMax: true },
        { reps: 3, pctOneRm: null, pctTopSet: [0.87, 0.92] as [number, number] },
        { reps: 6, pctOneRm: [0.78, 0.82] as [number, number] },
      ],
    }
    expect(suggestSetLoad('back-squat', p, 0, maxes)).toBeNull()
    expect(suggestSetLoad('back-squat', p, 1, maxes)).toBeNull()
    expect(suggestSetLoad('back-squat', p, 1, maxes, 110)?.kg).toBe(97.5)
    expect(suggestSetLoad('back-squat', p, 2, maxes)?.kg).toBe(95)
  })

  it('soulevé de terre : record propre, sinon 1,2 × squat', () => {
    const p = { sets: 5, reps: 5, unit: 'reps' as const, targetRpe: 9, pctOneRm: [0.8, 0.85] as [number, number] }
    const fromSquat = buildPlayerMaxes([rec('squat', 100, 1)], [], '2026-10-10')
    expect(suggestLoad('deadlift', p, fromSquat)?.kg).toBe(97.5)
    const own = buildPlayerMaxes([rec('squat', 100, 1), rec('souleve-de-terre', 160, 1)], [], '2026-10-10')
    // 160 × 0,825 = 132 kg, arrondi vers le bas au pas de 2,5 kg.
    expect(suggestLoad('deadlift', p, own)?.kg).toBe(130)
  })
})

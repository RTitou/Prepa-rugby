import { describe, expect, it } from 'vitest'
import {
  buildPlayerMaxes,
  loggedSetOneRepMax,
  percentOfMax,
  suggestLoad,
  type PlayerMaxes,
} from '../../src/engine/progression/suggestedLoad'
import type { PrescribedSet, SessionLog } from '../../src/types/plan'
import type { PerformanceRecord } from '../../src/types/records'

const TODAY = '2026-10-05'
const FIVE_AT_8: PrescribedSet = { sets: 4, reps: 5, unit: 'reps', targetRpe: 8 }

function record(partial: Partial<PerformanceRecord>): PerformanceRecord {
  return {
    id: partial.id ?? 'r',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    deletedAt: null,
    test: 'squat',
    value: 120,
    unit: 'kg',
    reps: 1,
    date: '2026-09-20',
    ...partial,
  } as PerformanceRecord
}

function log(partial: Partial<SessionLog>): SessionLog {
  return {
    id: 'l',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    deletedAt: null,
    sessionId: 's-2026-09-28-bas-force',
    date: '2026-09-28',
    weekStart: '2026-09-28',
    title: 'Muscu',
    status: 'terminee',
    warmupDone: true,
    sets: [],
    sessionRpe: 7,
    durationMin: 60,
    finishedAt: null,
    ...partial,
  } as SessionLog
}

describe('charges conseillées', () => {
  it('vise le % du max donné par les répétitions et la réserve (Epley inversé)', () => {
    expect(percentOfMax(5, 2)).toBeCloseTo(1 / (1 + 7 / 30), 6)
    expect(percentOfMax(1, 0)).toBe(1)
  })

  it('calcule la charge du squat depuis le record, arrondie à 2,5 kg en dessous', () => {
    const maxes = buildPlayerMaxes([record({})], [], TODAY)
    const load = suggestLoad('back-squat', FIVE_AT_8, maxes)
    // 120 × 0,811 = 97,3 → arrondi en dessous : 95 kg
    expect(load).toMatchObject({ kg: 95, perHand: false, basis: 'ton record de squat' })
  })

  it('dérive les exercices voisins par rapport au record (ex. soulevé roumain, haltères par main)', () => {
    const maxes: PlayerMaxes = { base: { squat: 150, 'developpe-couche': 100 }, logged: {} }
    expect(suggestLoad('romanian-deadlift', FIVE_AT_8, maxes)!.kg).toBe(90)
    const db = suggestLoad('dumbbell-bench-press', { sets: 3, reps: 8, unit: 'reps', targetRpe: 7 }, maxes)!
    expect(db.perHand).toBe(true)
    expect(db.kg % 2).toBe(0)
  })

  it('ramène un record de front squat au back squat', () => {
    const maxes = buildPlayerMaxes([record({ value: 85, variant: 'front-squat' })], [], TODAY)
    expect(maxes.base.squat).toBeCloseTo(100, 6)
  })

  it('préfère le max journalisé de l’exercice et ignore la séance en cours', () => {
    const logs = [
      log({ sets: [{ exerciseId: 'back-squat', setIndex: 1, loadKg: 120, reps: 5, rpe: 8, done: false }] }),
      log({ sessionId: 'en-cours', sets: [{ exerciseId: 'back-squat', setIndex: 1, loadKg: 200, reps: 5, rpe: 8, done: false }] }),
    ]
    const maxes = buildPlayerMaxes([record({})], logs, TODAY, 'en-cours')
    expect(maxes.logged['back-squat']).toBeCloseTo(120 * (1 + 7 / 30), 6)
    expect(suggestLoad('back-squat', FIVE_AT_8, maxes)).toMatchObject({ kg: 120, basis: 'tes dernières séances' })
  })

  it('n’utilise pas une série trop longue ou trop ancienne pour estimer un max', () => {
    expect(loggedSetOneRepMax({ loadKg: 50, reps: 15, rpe: 8 })).toBeNull()
    const old = log({ date: '2026-06-01', sets: [{ exerciseId: 'leg-press', setIndex: 1, loadKg: 200, reps: 5, rpe: 8, done: false }] })
    expect(buildPlayerMaxes([], [old], TODAY).logged).toEqual({})
  })

  it('ne propose rien sans max connu ni pour un travail sans charge', () => {
    const empty: PlayerMaxes = { base: {}, logged: {} }
    expect(suggestLoad('back-squat', FIVE_AT_8, empty)).toBeNull()
    expect(suggestLoad('plank', { sets: 3, reps: 30, unit: 's', targetRpe: 7 }, { base: { squat: 100 }, logged: {} })).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { totalDurationMin, ACTIVATE_FULL, ACTIVATE_SHORT } from '../../src/reference/activate/warmup'
import { getExercise } from '../../src/reference/exercises/library'
import { composeSession, parseSessionId, sessionId, type ComposeInput } from '../../src/engine/week-builder/composeSession'
import { isScheduledDeload, cycleAnchor, cycleWeekIndex } from '../../src/engine/progression/deload'
import { startingLevel } from '../../src/engine/progression/level'
import { POSITIONS, type LiftingExperience, type PositionNumber } from '../../src/types/profile'
import type { SessionSlot } from '../../src/types/plan'

function make(overrides: Partial<ComposeInput> & { experience?: LiftingExperience; position?: PositionNumber } = {}): ComposeInput {
  const { experience = '6-24-mois', position = 9, ...rest } = overrides
  return {
    date: '2026-10-07',
    slot: 'bas-force',
    index: 0,
    profile: { position, sex: 'homme', liftingExperience: experience },
    rotation: 41,
    deload: false,
    includeSpeed: false,
    ...rest,
  }
}

const SLOTS: SessionSlot[] = ['bas-force', 'haut', 'puissance', 'corps-entier', 'conditionnement', 'recuperation', 'activation']
const EXPERIENCES: LiftingExperience[] = ['moins-6-mois', '6-24-mois', 'plus-24-mois']

describe('échauffement et structure', () => {
  it('chaque séance commence par l’échauffement Activate', () => {
    for (const slot of SLOTS) {
      const s = composeSession(make({ slot }))
      expect(s.warmup.durationMin).toBeGreaterThan(0)
      const expected = s.warmup.version === 'complet' ? totalDurationMin(ACTIVATE_FULL) : totalDurationMin(ACTIVATE_SHORT)
      expect(s.warmup.durationMin).toBe(expected)
      expect(s.reasons).toBeInstanceOf(Array)
      expect(s.status).toBe('prevue')
    }
    expect(composeSession(make({ slot: 'bas-force' })).warmup.version).toBe('complet')
  })

  it('porte un identifiant stable relu par parseSessionId', () => {
    const s = composeSession(make())
    expect(s.id).toBe(sessionId('2026-10-07', 'bas-force'))
    expect(parseSessionId(s.id)).toEqual({ date: '2026-10-07', slot: 'bas-force' })
    expect(parseSessionId('abc')).toBeNull()
  })

  it('n’utilise que des exercices de la bibliothèque, sans doublon dans une séance', () => {
    for (const experience of EXPERIENCES) {
      for (const p of POSITIONS) {
        for (const slot of SLOTS) {
          for (const index of [0, 1, 2]) {
            const s = composeSession(make({ experience, position: p.number, slot, index, includeSpeed: true }))
            const ids = s.exercises.map((e) => e.exerciseId)
            ids.forEach((id) => expect(getExercise(id), id).toBeDefined())
            if (s.kind !== 'recuperation') expect(new Set(ids).size).toBe(ids.length)
            expect(s.exercises.length).toBeGreaterThan(0)
            for (const e of s.exercises) {
              expect(e.prescription.sets).toBeGreaterThanOrEqual(1)
              expect(e.prescription.reps).toBeGreaterThan(0)
            }
          }
        }
      }
    }
  })
})

describe('prescription par niveau (RC-5.1, RC-5.2)', () => {
  const principal = (experience: LiftingExperience) =>
    composeSession(make({ experience })).exercises.find((e) => e.block === 'force')!

  it('6-24 mois : force, 4 × 5 à 78-82 % @ RPE 8 sur le mouvement principal (semaine 1 de la vague)', () => {
    const e = principal('6-24-mois')
    expect(e.exerciseId).toBe('back-squat')
    expect(e.group).toBe('C')
    expect(e.prescription).toMatchObject({ sets: 4, reps: 5, targetRpe: 8, unit: 'reps', pctOneRm: [0.78, 0.82] })
  })

  it('moins de 6 mois : corps entier technique, % plafonnés, pas de série au max, jamais plus de RPE 8', () => {
    for (const cycleIndex of [0, 1, 2, 3]) {
      const s = composeSession(make({ experience: 'moins-6-mois', slot: 'corps-entier', position: 1, cycleIndex }))
      expect(s.title).toContain('technique')
      const c = s.exercises.find((e) => e.group === 'C')!
      expect(c.prescription.waves?.some((w) => w.toMax) ?? false).toBe(false)
      for (const r of [c.prescription.pctOneRm, ...(c.prescription.waves ?? []).map((w) => w.pctOneRm)]) {
        if (r) expect(r[1]).toBeLessThanOrEqual(0.8)
      }
      expect(Math.max(...s.exercises.map((e) => e.prescription.targetRpe ?? 0))).toBeLessThanOrEqual(8)
      expect(s.exercises.some((e) => e.group === 'F')).toBe(false)
    }
    expect(startingLevel('moins-6-mois').rpeCap).toBe(8)
  })

  it('plus de 24 mois : force et puissance différenciées, avec séries plus lourdes', () => {
    const lower = composeSession(make({ experience: 'plus-24-mois' }))
    expect(lower.exercises.some((e) => e.block === 'puissance')).toBe(true)
    const main = lower.exercises.find((e) => e.exerciseId === 'back-squat')!
    expect(main.group).toBe('C')
    // Semaine 4 de la vague : top set + plus de back-off que pour 6-24 mois.
    const top24 = composeSession(make({ experience: 'plus-24-mois', cycleIndex: 3 })).exercises.find((e) => e.group === 'C')!
    const top6 = composeSession(make({ experience: '6-24-mois', cycleIndex: 3 })).exercises.find((e) => e.group === 'C')!
    expect(top24.prescription.waves!.length).toBeGreaterThan(top6.prescription.waves!.length)
    const power = composeSession(make({ experience: 'plus-24-mois', slot: 'puissance' }))
    expect(power.exercises.filter((e) => e.block === 'puissance').length).toBeGreaterThanOrEqual(2)
    // Sans accent de poste (première ligne), pas de puissance avant 24 mois.
    expect(composeSession(make({ experience: '6-24-mois', position: 1 })).exercises.some((e) => e.block === 'puissance')).toBe(false)
  })

  it('les exercices tenus dans le temps sont prescrits en secondes', () => {
    const s = composeSession(make({ experience: '6-24-mois' }))
    const plank = s.exercises.find((e) => e.block === 'tronc')!
    expect(plank.prescription.unit).toBe('s')
  })

  it('mêmes entrées, même séance ; la semaine ISO fait alterner les variantes', () => {
    expect(composeSession(make())).toEqual(composeSession(make()))
    const a = composeSession(make({ slot: 'haut', rotation: 40 })).exercises.map((e) => e.exerciseId)
    const b = composeSession(make({ slot: 'haut', rotation: 41 })).exercises.map((e) => e.exerciseId)
    expect(a).not.toEqual(b)
  })
})

describe('accents par poste', () => {
  const ids = (position: PositionNumber, slot: SessionSlot) =>
    composeSession(make({ position, slot })).exercises.map((e) => e.exerciseId)

  it('première ligne : cou et force du haut du corps dans la séance haut', () => {
    const s = composeSession(make({ position: 1, slot: 'haut' }))
    expect(s.exercises.some((e) => e.block === 'cou')).toBe(true)
    expect(s.accents).toContain('Cou')
    expect(s.accents).toContain('Force du haut du corps')
  })

  it('ailier : pas d’accent cou prioritaire, mais puissance et ischios en excentrique en bas du corps', () => {
    expect(ids(14, 'haut').some((id) => id.startsWith('neck'))).toBe(false)
    const s = composeSession(make({ position: 14, slot: 'bas-force' }))
    expect(s.accents).toEqual(expect.arrayContaining(['Puissance', 'Ischios en excentrique']))
  })

  it('deux postes différents donnent des séances différentes', () => {
    expect(ids(1, 'haut')).not.toEqual(ids(14, 'haut'))
    expect(ids(1, 'bas-force')).not.toEqual(ids(14, 'bas-force'))
  })

  it('rappel de vitesse en tête, plus long pour un poste où la vitesse est prioritaire', () => {
    const wing = composeSession(make({ position: 14, includeSpeed: true }))
    const prop = composeSession(make({ position: 1, includeSpeed: true }))
    // En tête du travail (bloc B), juste après l'activation du bloc A.
    const firstWork = (s: ReturnType<typeof composeSession>) => s.exercises.find((e) => e.group !== 'A')!
    expect(firstWork(wing).block).toBe('vitesse')
    expect(firstWork(wing).group).toBe('B')
    expect(firstWork(wing).prescription.sets).toBeGreaterThan(firstWork(prop).prescription.sets)
  })
})

describe('semaine allégée et contexte', () => {
  const totalSets = (s: ReturnType<typeof composeSession>) => s.exercises.reduce((n, e) => n + e.prescription.sets, 0)

  it('réduit le volume et le RPE en semaine allégée', () => {
    const normal = composeSession(make())
    const light = composeSession(make({ deload: true }))
    expect(totalSets(light)).toBeLessThan(totalSets(normal) * 0.75)
    expect(light.maxRpe!).toBeLessThan(normal.maxRpe!)
    expect(light.deload).toBe(true)
    expect(light.reasons.map((r) => r.code)).toContain('deload')
  })

  it('exclut les exercices demandés et choisit le suivant du gabarit', () => {
    const s = composeSession(make({ context: { excludedExerciseIds: ['back-squat'] } }))
    const ids = s.exercises.map((e) => e.exerciseId)
    expect(ids).not.toContain('back-squat')
    expect(ids).toContain('front-squat')
  })

  it('ajoute les raisons du contexte à la séance', () => {
    const s = composeSession(make({ context: { reasons: [{ code: 'x', text: 'Test', source: 'charge' }] } }))
    expect(s.reasons.find((r) => r.code === 'x')?.source).toBe('charge')
  })
})

describe('autres séances', () => {
  it('conditionnement calibré sur le pic du poste', () => {
    const s = composeSession(make({ slot: 'conditionnement', position: 9 }))
    expect(s.kind).toBe('conditionnement')
    expect(s.exercises[0]!.note).toContain('185')
  })

  it('récupération : RPE ≤ 2, sans charge ; activation légère facultative sans intensité', () => {
    const rec = composeSession(make({ slot: 'recuperation' }))
    expect(rec.maxRpe).toBe(2)
    expect(rec.exercises.every((e) => (e.prescription.targetRpe ?? 0) <= 2)).toBe(true)
    const act = composeSession(make({ slot: 'activation' }))
    expect(act.optional).toBe(true)
    expect(act.maxRpe).toBeLessThanOrEqual(6)
  })
})

describe('cycle de semaine allégée (RC-5.3)', () => {
  it('une semaine sur cinq', () => {
    const flags = Array.from({ length: 10 }, (_, i) => isScheduledDeload(i))
    expect(flags).toEqual([false, false, false, false, true, false, false, false, false, true])
    expect(isScheduledDeload(-1)).toBe(false)
  })

  it('compte depuis la dernière décharge stockée, sinon depuis le début du suivi', () => {
    expect(cycleAnchor('2026-11-09', [], '2026-10-05')).toBe('2026-10-05')
    expect(cycleAnchor('2026-11-09', ['2026-11-02'], '2026-10-05')).toBe('2026-11-09')
    expect(cycleWeekIndex('2026-11-09', '2026-10-05')).toBe(5)
    expect(cycleWeekIndex('2026-10-05', '2026-10-05')).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { ACTIVATE_FULL, ACTIVATE_PROGRAMMES, ACTIVATE_SHORT, totalDurationMin } from '../../src/reference/activate/warmup'
import { EXERCISES, exercisesWithout, getExercise } from '../../src/reference/exercises/library'
import { MATCH_PEAKS, POSITION_EMPHASIS, getPositionEmphasis } from '../../src/reference/exercises/positionEmphasis'
import { ALL_NORMS, getNorm, getNorms, levelAbove } from '../../src/reference/norms'
import { LEVEL_ORDER } from '../../src/reference/norms/levels'
import { WOMEN_NORMS } from '../../src/reference/norms/women'
import { getSource, SOURCES } from '../../src/reference/sources'
import {
  SEVERE_SIGNS,
  SUBSTITUTION_RULES,
  getSubstitutionRule,
  isExerciseExcluded,
  isExcludedByZones,
  suspendsPlan,
} from '../../src/reference/substitutions/table'
import { POSITIONS, PLAY_LEVELS } from '../../src/types/profile'
import { BODY_ZONES, EXERCISE_CATEGORIES } from '../../src/types/reference'
import type { BodyZone, ExerciseCategory } from '../../src/types/reference'

const ZONES = BODY_ZONES.map((z) => z.value)

describe('sources', () => {
  it('ont des identifiants uniques et un niveau de preuve', () => {
    const ids = SOURCES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of SOURCES) expect(['A', 'B', 'C']).toContain(s.evidence)
  })
})

describe('repères de performance', () => {
  it('chaque valeur a une source existante, un niveau de preuve et un protocole', () => {
    expect(ALL_NORMS.length).toBeGreaterThan(0)
    const ids = new Set<string>()
    for (const n of ALL_NORMS) {
      expect(getSource(n.sourceId), n.id).toBeDefined()
      expect(['A', 'B', 'C']).toContain(n.evidence)
      expect(n.protocol.description.length).toBeGreaterThan(0)
      expect(Number.isFinite(n.mean)).toBe(true)
      if (n.sd !== undefined) expect(n.sd).toBeGreaterThan(0)
      expect(ids.has(n.id), `id en double : ${n.id}`).toBe(false)
      ids.add(n.id)
      if (n.protocol.exerciseId) expect(getExercise(n.protocol.exerciseId), n.id).toBeDefined()
    }
  })

  it('marque « à revérifier » les valeurs de Darrall-Jones 2015 et Read 2018', () => {
    const dj = ALL_NORMS.filter((n) => n.sourceId === 'darrall-jones-2015')
    expect(dj.length).toBeGreaterThan(0)
    for (const n of dj) expect(n.toVerify, n.id).toBe(true)
    expect(MATCH_PEAKS.toVerify).toBe(true)
  })

  it('marque « estimation » tous les niveaux amateurs rattachés, avec une justification', () => {
    for (const level of ['federale', 'nationale'] as const) {
      const norms = ALL_NORMS.filter((n) => n.level === level)
      expect(norms.length).toBeGreaterThan(0)
      for (const n of norms) {
        expect(n.estimate, n.id).toBe(true)
        expect(n.note ?? '').toContain('Estimation')
      }
    }
    for (const n of ALL_NORMS.filter((n) => n.level === 'espoirs' || n.level === 'pro')) expect(n.estimate).toBe(false)
  })

  it('n’expose rien pour loisir et régional', () => {
    for (const level of ['loisir', 'regional'] as const) expect(ALL_NORMS.some((n) => n.level === level)).toBe(false)
  })

  it('rend le repère squat avant du niveau au-dessus avec sa source (nationale -> espoirs)', () => {
    const norm = getNorm({ sex: 'homme', line: 'avants', level: levelAbove('nationale'), test: 'squat' })
    expect(norm).toBeDefined()
    expect(norm?.level).toBe('espoirs')
    expect(norm?.mean).toBeGreaterThan(0)
    expect(getSource(norm?.sourceId ?? '')).toBeDefined()
  })

  it('rend un repère estimé pour un avant fédéral (niveau au-dessus : nationale)', () => {
    const norm = getNorm({ sex: 'homme', line: 'avants', level: levelAbove('federale'), test: 'squat' })
    expect(norm?.estimate).toBe(true)
    expect(getSource(norm?.sourceId ?? '')).toBeDefined()
  })

  it('distingue plusieurs protocoles de squat', () => {
    const base = { sex: 'homme', line: 'avants', level: 'espoirs', test: 'squat' } as const
    expect(getNorms(base).length).toBeGreaterThan(1)
    expect(getNorm({ ...base, protocolId: 'back-squat-1rm-abs' })?.unit).toBe('kg')
    expect(getNorm({ ...base, protocolId: 'front-squat-3rm-rel' })?.unit).toBe('kg/kg')
  })

  it('ne rend aucun repère pour une joueuse', () => {
    expect(WOMEN_NORMS).toHaveLength(0)
    for (const level of PLAY_LEVELS) {
      expect(getNorm({ sex: 'femme', line: 'avants', level: level.value, test: 'squat' })).toBeUndefined()
    }
  })

  it('ne rend aucun repère Bronco', () => {
    for (const level of PLAY_LEVELS) {
      expect(getNorm({ sex: 'homme', line: 'arrieres', level: level.value, test: 'bronco' })).toBeUndefined()
    }
  })

  it('rend les temps de sprint pro et pas de 40 m pro', () => {
    expect(getNorm({ sex: 'homme', line: 'arrieres', level: 'pro', test: 'sprint-10m' })?.mean).toBe(1.66)
    expect(getNorm({ sex: 'homme', line: 'arrieres', level: 'pro', test: 'sprint-40m' })).toBeUndefined()
  })
})

describe('échelle des niveaux', () => {
  it('levelAbove monte d’un cran et reste au plus haut', () => {
    expect(levelAbove('pro')).toBe('pro')
    expect(levelAbove('loisir')).toBe('regional')
    expect(levelAbove('espoirs')).toBe('pro')
    expect(LEVEL_ORDER).toEqual(PLAY_LEVELS.map((l) => l.value))
  })
})

describe('bibliothèque d’exercices', () => {
  it('a des identifiants uniques et des champs valides', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const categories = new Set(EXERCISE_CATEGORIES.map((c) => c.value))
    for (const e of EXERCISES) {
      expect(categories.has(e.category), e.id).toBe(true)
      expect(e.instructions.length, e.id).toBeGreaterThan(10)
      for (const z of e.zones) expect(ZONES, `${e.id} : ${z}`).toContain(z)
      expect(e.equipment.length, e.id).toBeGreaterThan(0)
    }
  })

  // Exemptions : une catégorie dont la définition est la zone elle-même ne peut pas s'en passer.
  const EXEMPT: Partial<Record<ExerciseCategory, BodyZone[]>> = {
    cou: ['cou'],
    'ischios-excentrique': ['ischios'],
  }

  it.each(EXERCISE_CATEGORIES.map((c) => c.value))('catégorie %s : au moins 3 exercices sans chaque zone', (category) => {
    for (const zone of ZONES) {
      if (EXEMPT[category]?.includes(zone)) continue
      expect(exercisesWithout([zone], category).length, `${category} sans ${zone}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('a au moins 3 exercices dans chaque catégorie', () => {
    for (const c of EXERCISE_CATEGORIES) {
      expect(EXERCISES.filter((e) => e.category === c.value).length, c.value).toBeGreaterThanOrEqual(3)
    }
  })

  it('note le Nordic comme « preuves débattues »', () => {
    expect(getExercise('nordic-curl')?.evidenceNote).toContain('débattues')
    expect(getExercise('nordic-curl')?.category).toBe('ischios-excentrique')
  })

  it('propose des intermittents calibrés sur les pics', () => {
    expect(EXERCISES.some((e) => e.category === 'conditionnement' && e.peakCalibrated)).toBe(true)
  })
})

describe('table de substitution', () => {
  it('couvre chaque zone avec un message', () => {
    for (const zone of ZONES) {
      const rule = getSubstitutionRule(zone)
      expect(rule.message.length, zone).toBeGreaterThan(0)
      expect(rule.reviewedByPhysio).toBe(false)
      for (const id of rule.sourceIds) expect(getSource(id), `${zone} : ${id}`).toBeDefined()
    }
    expect(SUBSTITUTION_RULES).toHaveLength(ZONES.length)
  })

  it('référence uniquement des exercices existants', () => {
    for (const rule of SUBSTITUTION_RULES) {
      for (const id of [...rule.excludeExerciseIds, ...rule.substituteIds]) {
        expect(getExercise(id), `${rule.zone} : ${id}`).toBeDefined()
      }
    }
  })

  it('aucun substitut ne sollicite la zone remplacée ni n’est exclu par sa propre règle', () => {
    for (const rule of SUBSTITUTION_RULES) {
      if (rule.suspend) continue
      expect(rule.substituteIds.length, rule.zone).toBeGreaterThan(0)
      for (const id of rule.substituteIds) {
        const exercise = getExercise(id)!
        expect(exercise.zones, `${rule.zone} : ${id}`).not.toContain(rule.zone)
        for (const z of rule.excludeZones) expect(exercise.zones, `${rule.zone} : ${id}`).not.toContain(z)
        expect(isExerciseExcluded(rule, exercise), `${rule.zone} : ${id}`).toBe(false)
      }
    }
  })

  it('exclut les exercices qui sollicitent la zone', () => {
    const knee = getSubstitutionRule('genou')
    expect(isExerciseExcluded(knee, getExercise('back-squat')!)).toBe(true)
    expect(isExerciseExcluded(knee, getExercise('sprint-10m')!)).toBe(true)
    expect(isExerciseExcluded(knee, getExercise('hip-thrust')!)).toBe(false)
    const back = getSubstitutionRule('bas-du-dos')
    expect(isExerciseExcluded(back, getExercise('front-squat')!)).toBe(true)
    expect(isExerciseExcluded(back, getExercise('leg-press')!)).toBe(false)
  })

  it('cumule plusieurs zones', () => {
    expect(isExcludedByZones(['genou', 'epaule'], getExercise('bench-press')!)).toBe(true)
    expect(isExcludedByZones(['genou', 'epaule'], getExercise('hip-thrust')!)).toBe(false)
  })

  it('la commotion suspend le plan avec le message World Rugby', () => {
    const rule = getSubstitutionRule('tete')
    expect(rule.suspend).toBe(true)
    expect(rule.excludeAll).toBe(true)
    expect(rule.message).toContain('21 jours')
    expect(rule.message).toContain('World Rugby')
    expect(rule.returnToPlay?.minDaysBeforePlaying).toBe(21)
    expect(suspendsPlan(['tete'])).toBe(true)
    expect(suspendsPlan(['genou'])).toBe(false)
    for (const e of EXERCISES) expect(isExcludedByZones(['tete'], e)).toBe(true)
  })

  it('liste les signes graves', () => {
    expect(SEVERE_SIGNS.map((s) => s.id)).toEqual(['perte-de-connaissance', 'deformation', 'appui-impossible', 'symptomes-neurologiques'])
  })
})

describe('échauffement Activate', () => {
  it('a des étapes ordonnées avec durée et des exercices existants', () => {
    for (const programme of ACTIVATE_PROGRAMMES) {
      expect(programme.reviewedByPhysio).toBe(false)
      programme.steps.forEach((step, index) => {
        expect(step.order).toBe(index + 1)
        expect(step.durationMin).toBeGreaterThan(0)
        for (const id of step.exerciseIds) expect(getExercise(id), `${programme.id} : ${id}`).toBeDefined()
      })
      for (const id of programme.sourceIds) expect(getSource(id)).toBeDefined()
      expect(programme.steps.some((s) => s.component === 'cou')).toBe(true)
    }
  })

  it('dure environ 15 à 20 minutes en version complète, moins en version courte', () => {
    const full = totalDurationMin(ACTIVATE_FULL)
    expect(full).toBeGreaterThanOrEqual(15)
    expect(full).toBeLessThanOrEqual(20)
    expect(totalDurationMin(ACTIVATE_SHORT)).toBeLessThan(full)
  })
})

describe('accents par poste', () => {
  it('couvre tous les sous-groupes avec sources et exercices existants', () => {
    for (const emphasis of Object.values(POSITION_EMPHASIS)) {
      expect(emphasis.rationale.length).toBeGreaterThan(0)
      for (const id of emphasis.sourceIds) expect(getSource(id), `${emphasis.subgroup} : ${id}`).toBeDefined()
      for (const id of emphasis.conditioningExerciseIds) expect(getExercise(id), id).toBeDefined()
    }
    for (const p of POSITIONS) expect(getPositionEmphasis(p.number).subgroup).toBe(p.subgroup)
  })

  it('met le cou en priorité pour les premières lignes et la vitesse pour les ailiers-arrière', () => {
    expect(getPositionEmphasis(1).priorities[0]?.category).toBe('cou')
    expect(getPositionEmphasis(14).priorities[0]?.category).toBe('vitesse')
  })

  it('référence la source des pics de match', () => {
    expect(getSource(MATCH_PEAKS.sourceId)).toBeDefined()
  })
})

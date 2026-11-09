import { describe, expect, it } from 'vitest'
import { addDays, diffDays, isoWeekNumber, mondayOf, weekdayOf } from '../../src/engine/dates'
import { inputHash } from '../../src/engine/hash'
import { closeMatchFlags, findCloseMatches, mdLabel, mdOffset, weekHasMatch } from '../../src/engine/matchDay'

const SAT = { date: '2026-10-10', time: null }

describe('dates', () => {
  it('calcule lundi, jour ISO et écarts', () => {
    expect(mondayOf('2026-10-11')).toBe('2026-10-05')
    expect(weekdayOf('2026-10-05')).toBe(1)
    expect(weekdayOf('2026-10-11')).toBe(7)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(diffDays('2026-10-05', '2026-10-12')).toBe(7)
    expect(isoWeekNumber('2026-01-01')).toBe(1)
  })
})

describe('étiquettes MD±n (tâche 1)', () => {
  it('match samedi : vendredi MD-1, dimanche MD+1, lundi MD+2, mardi MD-4', () => {
    const next = { date: '2026-10-17', time: null }
    const labels = Array.from({ length: 7 }, (_, i) => mdLabel(mdOffset(addDays('2026-10-05', i), [SAT, next])))
    expect(labels).toEqual(['MD-5', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1'])
    expect(mdLabel(mdOffset('2026-10-12', [SAT, next]))).toBe('MD+2')
  })

  it('sans match dans la fenêtre : aucune étiquette', () => {
    expect(mdOffset('2026-10-05', [])).toBeNull()
    expect(mdOffset('2026-10-05', [{ date: '2026-11-01', time: null }])).toBeNull()
    expect(weekHasMatch('2026-10-05', [{ date: '2026-10-17', time: null }])).toBe(false)
    expect(weekHasMatch('2026-10-05', [SAT])).toBe(true)
  })

  it('après le match sans prochain match connu, MD+n se poursuit', () => {
    expect(mdLabel(mdOffset('2026-10-13', [SAT]))).toBe('MD+3')
  })
})

describe('deux matchs à moins de 72 h', () => {
  it('signale samedi et lundi (48 h), pas samedi et mardi (96 h)', () => {
    expect(findCloseMatches([SAT, { date: '2026-10-12', time: null }])).toHaveLength(1)
    expect(findCloseMatches([SAT, { date: '2026-10-13', time: null }])).toHaveLength(0)
  })

  it("tient compte de l'heure : vendredi 20:00 → dimanche 15:00 = 43 h", () => {
    const pairs = findCloseMatches([
      { date: '2026-10-09', time: '20:00' },
      { date: '2026-10-11', time: '15:00' },
    ])
    expect(pairs).toHaveLength(1)
    expect(Math.round(pairs[0]!.hours)).toBe(43)
  })

  it('expose un signalement pour la semaine concernée', () => {
    const flags = closeMatchFlags('2026-10-05', [SAT, { date: '2026-10-12', time: null }])
    expect(flags).toHaveLength(1)
    expect(flags[0]!.code).toBe('matchs-rapproches')
    expect(flags[0]!.dates).toEqual(['2026-10-10', '2026-10-12'])
    expect(closeMatchFlags('2026-10-26', [SAT, { date: '2026-10-12', time: null }])).toHaveLength(0)
  })
})

describe('empreinte', () => {
  it("est stable et ne dépend pas de l'ordre des clés", () => {
    expect(inputHash({ a: 1, b: [1, 2] })).toBe(inputHash({ b: [1, 2], a: 1 }))
    expect(inputHash({ a: 1 })).not.toBe(inputHash({ a: 2 }))
  })
})

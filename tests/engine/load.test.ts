import { describe, expect, it } from 'vitest'
import { mergeContexts } from '../../src/engine/context'
import { addDays } from '../../src/engine/dates'
import { adaptPlan, repeatedPainZones, type AdaptationInput, type MorningInput } from '../../src/engine/load/adjust'
import { computeAlerts } from '../../src/engine/load/alerts'
import {
  dailyLoad,
  fourWeekLoad,
  hasLoadHistory,
  loadsFromLogs,
  loadsFromRatings,
  previousWeeksMean,
  sRpe,
  weeklyLoad,
  type LoadEntry,
} from '../../src/engine/load/sessionLoad'
import { assessWellness, baselineFor, sleepMean, totalScore } from '../../src/engine/load/wellnessScore'
import { buildWeek, type BuildWeekInput, type ClubLite } from '../../src/engine/week-builder/buildWeek'
import { getExercise } from '../../src/reference/exercises/library'
import type { DayPlan } from '../../src/types/plan'
import type { BodyZone } from '../../src/types/reference'
import type { WellnessScores } from '../../src/types/wellness'

const TODAY = '2026-10-07' // mercredi
const MONDAY = '2026-10-05'

const scores = (fatigue: number, sommeil: number, douleurs: number, stress: number, humeur: number): WellnessScores => ({
  fatigue,
  sommeil,
  douleurs,
  stress,
  humeur,
})

const NORMAL = scores(4, 4, 4, 4, 4)

/** `count` jours de ressenti qui précèdent `before`, en alternant 4 et 5 sur tous les items (écart-type non nul). */
function history(before: string, count: number, painZone: BodyZone | null = null): MorningInput[] {
  return Array.from({ length: count }, (_, i) => {
    const v = i % 2 === 0 ? 4 : 5
    return { date: addDays(before, -(count - i)), scores: scores(v, v, v, v, v), painZone }
  })
}

const load = (date: string, source: LoadEntry['source'], rpe: number, durationMin: number): LoadEntry => ({ date, source, rpe, durationMin })

describe('charge de séance (sRPE)', () => {
  it('multiplie le RPE par la durée, et ignore une saisie invalide', () => {
    expect(sRpe(7, 60)).toBe(420)
    expect(sRpe(0, 60)).toBe(0)
    expect(sRpe(null, 60)).toBe(0)
    expect(sRpe(7, 0)).toBe(0)
    expect(sRpe(-1, 30)).toBe(0)
  })

  it('cumule par jour, par semaine et sur 4 semaines, séances appli, club et match confondus', () => {
    const entries = [
      load('2026-10-05', 'appli', 8, 60), // 480
      load('2026-10-05', 'club', 6, 90), // 540 : même jour
      load('2026-10-10', 'match', 7, 80), // 560
      load('2026-09-30', 'club', 5, 60), // 300 : semaine précédente
      load('2026-09-14', 'club', 5, 60), // 300 : premier jour des 4 semaines (21 jours avant le 5 oct.)
      load('2026-09-13', 'club', 9, 100), // la veille : hors des 4 semaines
    ]
    expect(dailyLoad(entries, '2026-10-05')).toBe(1020)
    expect(dailyLoad(entries, '2026-10-05', ['appli'])).toBe(480)
    expect(weeklyLoad(entries, MONDAY)).toBe(1580)
    expect(weeklyLoad(entries, MONDAY, ['club', 'match'])).toBe(1100)
    // 4 semaines : du lundi 14 septembre au dimanche 11 octobre
    expect(fourWeekLoad(entries, MONDAY)).toBe(1580 + 300 + 300)
  })

  it('construit les charges depuis les journaux terminés et les notes (celles sans RPE sont ignorées)', () => {
    const logs = [
      { date: '2026-10-05', status: 'terminee' as const, sessionRpe: 7, durationMin: 50 },
      { date: '2026-10-06', status: 'en-cours' as const, sessionRpe: null, durationMin: null },
    ]
    const ratings = [
      { kind: 'club' as const, date: '2026-10-06', rpe: 6, durationMin: 90 },
      { kind: 'match' as const, date: '2026-10-10', rpe: null, durationMin: null },
    ]
    expect(loadsFromLogs(logs)).toEqual([{ date: '2026-10-05', source: 'appli', rpe: 7, durationMin: 50 }])
    expect(loadsFromRatings(ratings)).toEqual([{ date: '2026-10-06', source: 'club', rpe: 6, durationMin: 90 }])
  })

  it('moyenne des 3 semaines précédentes, seulement sur les semaines couvertes par des données', () => {
    const full = [load('2026-09-14', 'club', 10, 100), load('2026-09-21', 'club', 10, 100), load('2026-09-28', 'club', 10, 100)]
    expect(previousWeeksMean(full, MONDAY)).toEqual({ mean: 1000, weeks: 3 })
    expect(hasLoadHistory(full, MONDAY)).toBe(true)
    // première charge le 22 sept. : seule la semaine du 28 est entièrement couverte
    const short = [load('2026-09-22', 'club', 10, 100), load('2026-09-30', 'club', 10, 100)]
    expect(previousWeeksMean(short, MONDAY)).toEqual({ mean: 1000, weeks: 1 })
    expect(hasLoadHistory(short, MONDAY)).toBe(false)
    expect(previousWeeksMean([], MONDAY)).toBeNull()
  })
})

describe('ressenti : z-score individuel et seuils de repli', () => {
  it('somme les cinq items (5 = meilleur état)', () => {
    expect(totalScore(scores(5, 5, 5, 5, 5))).toBe(25)
    expect(totalScore(scores(1, 1, 1, 1, 1))).toBe(5)
  })

  it('calcule une base individuelle seulement à partir de 14 jours', () => {
    expect(baselineFor(history(TODAY, 13), TODAY)).toBeNull()
    expect(baselineFor(history(TODAY, 14), TODAY)?.days).toBe(14)
  })

  it('avec 14 jours de base : un ressenti très dégradé donne une alerte, un ressenti habituel non', () => {
    const mornings = history(TODAY, 14)
    const bad = assessWellness({ date: TODAY, scores: scores(2, 2, 2, 2, 2) }, mornings)
    expect(bad.mode).toBe('z')
    expect(bad.zTotal).toBeLessThanOrEqual(-1.5)
    expect(bad.degraded).toBe(true)
    const usual = assessWellness({ date: TODAY, scores: scores(4, 5, 4, 5, 4) }, mornings)
    expect(usual.mode).toBe('z')
    expect(usual.degraded).toBe(false)
  })

  it('alerte aussi quand deux items ont un z ≤ −1 sans que le total soit à −1,5', () => {
    const mornings = history(TODAY, 14)
    const entry = scores(3, 3, 5, 5, 5)
    const a = assessWellness({ date: TODAY, scores: entry }, mornings)
    expect(a.zTotal!).toBeGreaterThan(-1.5)
    expect(a.lowItems.sort()).toEqual(['fatigue', 'sommeil'])
    expect(a.degraded).toBe(true)
    // un seul item bas ne suffit pas
    expect(assessWellness({ date: TODAY, scores: scores(3, 5, 5, 5, 5) }, mornings).degraded).toBe(false)
  })

  it('tient compte de la base du joueur : un total de 15 est normal pour qui répond toujours bas', () => {
    const lowPlayer = Array.from({ length: 14 }, (_, i) => {
      const v = i % 2 === 0 ? 3 : 4
      return { date: addDays(TODAY, -(14 - i)), scores: scores(v, v, v, v, v) }
    })
    expect(assessWellness({ date: TODAY, scores: scores(3, 3, 3, 3, 3) }, lowPlayer).degraded).toBe(false)
  })

  it('moins de 14 jours : seuils absolus de repli (total ≤ 12 sur 25 ou un item ≤ 2)', () => {
    const short = history(TODAY, 13)
    const total12 = assessWellness({ date: TODAY, scores: scores(3, 3, 2, 2, 2) }, short)
    expect(total12.mode).toBe('absolu')
    expect(total12.total).toBe(12)
    expect(total12.degraded).toBe(true)
    const oneItem = assessWellness({ date: TODAY, scores: scores(5, 2, 5, 5, 5) }, short)
    expect(oneItem.mode).toBe('absolu')
    expect(oneItem.degraded).toBe(true)
    expect(assessWellness({ date: TODAY, scores: scores(3, 3, 3, 3, 3) }, short).degraded).toBe(false)
    // sans aucun historique
    expect(assessWellness({ date: TODAY, scores: scores(4, 4, 4, 4, 4) }, []).mode).toBe('absolu')
  })

  it('sommeil moyen sur 7 jours, avec au moins 4 saisies', () => {
    const week = Array.from({ length: 7 }, (_, i) => ({ date: addDays(TODAY, -i), scores: scores(4, 2, 4, 4, 4) }))
    expect(sleepMean(week, TODAY)).toBe(2)
    expect(sleepMean(week.slice(0, 3), TODAY)).toBeNull()
  })
})

describe('alertes', () => {
  const base = { weekStart: MONDAY, today: TODAY, mornings: [] as MorningInput[], loads: [] as LoadEntry[], matches: [] }
  const codes = (input: Parameters<typeof computeAlerts>[0]) => computeAlerts(input).map((a) => a.code)

  it('ressenti dégradé : alerte de source « ressenti » en une phrase', () => {
    const mornings = [...history(TODAY, 14), { date: TODAY, scores: scores(1, 1, 1, 1, 1), painZone: null }]
    const alerts = computeAlerts({ ...base, mornings })
    const a = alerts.find((x) => x.code === 'ressenti-degrade')!
    expect(a.source).toBe('ressenti')
    expect(a.text).toMatch(/en dessous de ton niveau habituel/)
  })

  it('pas d’alerte de ressenti sans saisie du jour', () => {
    expect(codes({ ...base, mornings: history(TODAY, 14) })).toEqual([])
  })

  it('montée rapide : plus de 30 % au-dessus de la moyenne des 3 semaines précédentes, avec historique suffisant', () => {
    const prior = [load('2026-09-14', 'club', 10, 100), load('2026-09-21', 'club', 10, 100), load('2026-09-28', 'club', 10, 100)] // 1000 UA chacune
    expect(codes({ ...base, loads: [...prior, load('2026-10-06', 'appli', 10, 140)] })).toContain('montee-rapide') // 1400 > 1300
    expect(codes({ ...base, loads: [...prior, load('2026-10-06', 'appli', 10, 125)] })).not.toContain('montee-rapide') // 1250
    const a = computeAlerts({ ...base, loads: [...prior, load('2026-10-06', 'appli', 10, 140)] }).find((x) => x.code === 'montee-rapide')!
    expect(a.source).toBe('charge')
  })

  it('montée rapide : jamais avec un historique insuffisant (une seule semaine précédente)', () => {
    const loads = [load('2026-09-29', 'club', 5, 60), load('2026-10-06', 'appli', 10, 200)]
    expect(codes({ ...base, loads })).not.toContain('montee-rapide')
    expect(codes({ ...base, loads: [load('2026-10-06', 'appli', 10, 200)] })).not.toContain('montee-rapide')
  })

  it('deux matchs à moins de 72 h : alerte pour chaque semaine touchée, quelle que soit la date du jour', () => {
    const matches = [
      { date: '2026-10-10', time: '15:00' },
      { date: '2026-10-12', time: '10:00' },
    ]
    expect(codes({ ...base, matches })).toContain('matchs-rapproches')
    expect(codes({ ...base, weekStart: '2026-10-12', matches })).toContain('matchs-rapproches')
    expect(codes({ ...base, weekStart: '2026-10-19', matches })).not.toContain('matchs-rapproches')
    // 96 h : pas d'alerte
    expect(codes({ ...base, matches: [{ date: '2026-10-10', time: '15:00' }, { date: '2026-10-14', time: '15:00' }] })).toEqual([])
  })

  it('charge hors appli élevée : club et matchs seulement, au-dessus du seuil', () => {
    const club = [load('2026-10-05', 'club', 7, 90), load('2026-10-07', 'club', 7, 90), load('2026-10-06', 'club', 7, 90)] // 1890
    expect(codes({ ...base, loads: club })).not.toContain('charge-hors-appli')
    expect(codes({ ...base, loads: [...club, load('2026-10-04', 'match', 6, 80)] })).not.toContain('charge-hors-appli') // le match de dimanche est de la semaine d'avant
    expect(codes({ ...base, loads: [...club, load('2026-10-07', 'match', 6, 80)] })).toContain('charge-hors-appli') // 2370
    // la charge de l'appli ne compte pas comme « hors appli »
    expect(codes({ ...base, loads: [load('2026-10-05', 'appli', 9, 300)] })).not.toContain('charge-hors-appli')
  })

  it('sommeil moyen faible sur 7 jours', () => {
    const mornings = Array.from({ length: 7 }, (_, i) => ({ date: addDays(TODAY, -i), scores: scores(4, 2, 4, 4, 4), painZone: null }))
    const a = computeAlerts({ ...base, mornings }).find((x) => x.code === 'sommeil-faible')!
    expect(a.source).toBe('ressenti')
    expect(a.text).toMatch(/sommeil/)
  })

  it('les alertes d’état du jour ne touchent pas les semaines suivantes', () => {
    const mornings = [...history(TODAY, 14), { date: TODAY, scores: scores(1, 1, 1, 1, 1), painZone: null }]
    expect(codes({ ...base, mornings, weekStart: '2026-10-12' })).toEqual([])
  })
})

describe('adaptation du plan : contexte', () => {
  const input = (over: Partial<AdaptationInput> = {}): AdaptationInput => ({
    weekStart: MONDAY,
    today: TODAY,
    mornings: [],
    matchRatings: [],
    loads: [],
    matches: [],
    ...over,
  })
  const veryBad = [...history(TODAY, 14), { date: TODAY, scores: scores(1, 1, 1, 1, 1), painZone: null }]

  it('sans saisie, le contexte est vide : une séance manquée n’ajoute rien', () => {
    expect(adaptPlan(input()).context).toEqual({})
    // une séance de l'appli non faite n'a pas de journal terminé : aucune charge, aucun rattrapage
    expect(adaptPlan(input({ loads: [] })).context.extraMuscuSession).toBeUndefined()
    expect(adaptPlan(input({ loads: [] })).context.volumeFactor).toBeUndefined()
  })

  it('une alerte : volume ×0,6, pas de RPE ≥ 9, conditionnement léger, raisons en une phrase avec leur source', () => {
    const { context, alerts } = adaptPlan(input({ mornings: veryBad }))
    expect(alerts.map((a) => a.code)).toEqual(['ressenti-degrade'])
    expect(context.volumeFactor).toBe(0.6)
    expect(context.maxTargetRpe).toBe(8)
    expect(context.lightConditioning).toBe(true)
    expect(context.reasons!.map((r) => r.code)).toEqual(['ressenti-degrade', 'allegement'])
    expect(context.reasons!.every((r) => r.source === 'ressenti')).toBe(true)
    expect(context.reasons![1]!.text).toMatch(/Volume réduit de 40 %/)
  })

  it('plusieurs alertes : volume ×0,5 ; charge hors appli : maintien minimal de 2 séances', () => {
    const club = [load('2026-10-05', 'club', 7, 90), load('2026-10-06', 'club', 7, 90), load('2026-10-07', 'club', 7, 90), load('2026-10-07', 'match', 6, 80)]
    const { context } = adaptPlan(input({ mornings: veryBad, loads: club }))
    expect(context.volumeFactor).toBe(0.5)
    expect(context.maxMuscuSessions).toBe(2)
    expect(context.reasons!.some((r) => r.source === 'charge')).toBe(true)
  })

  it('douleur sur la même zone deux jours de suite : zone en vigilance avec sa raison ; un seul jour ou deux zones : rien', () => {
    const mk = (a: BodyZone | null, b: BodyZone | null): MorningInput[] => [
      { date: '2026-10-06', scores: NORMAL, painZone: a },
      { date: TODAY, scores: NORMAL, painZone: b },
    ]
    expect(repeatedPainZones(mk('genou', 'genou'), TODAY)).toEqual(['genou'])
    expect(repeatedPainZones(mk('genou', 'ischios'), TODAY)).toEqual([])
    expect(repeatedPainZones(mk(null, 'genou'), TODAY)).toEqual([])
    const ctx = adaptPlan(input({ mornings: mk('genou', 'genou') })).context
    expect(ctx.painZones).toEqual(['genou'])
    expect(ctx.reasons!.find((r) => r.code === 'douleur-repetee')).toMatchObject({ source: 'ressenti' })
    expect(ctx.reasons!.find((r) => r.code === 'douleur-repetee')!.text).toMatch(/genou/)
    expect(adaptPlan(input({ mornings: mk('genou', null) })).context.painZones).toBeUndefined()
    // sans saisie aujourd'hui : hier et avant-hier comptent encore
    const earlier: MorningInput[] = [
      { date: '2026-10-05', scores: NORMAL, painZone: 'genou' },
      { date: '2026-10-06', scores: NORMAL, painZone: 'genou' },
    ]
    expect(repeatedPainZones(earlier, TODAY)).toEqual(['genou'])
  })

  it('la douleur répétée ne vaut que pour la semaine en cours', () => {
    const mornings: MorningInput[] = [
      { date: '2026-10-06', scores: NORMAL, painZone: 'genou' },
      { date: TODAY, scores: NORMAL, painZone: 'genou' },
    ]
    expect(adaptPlan(input({ mornings, weekStart: '2026-10-12' })).context.painZones).toBeUndefined()
  })

  it('deux matchs à moins de 72 h : mode récupération, aucune compensation ni séance en plus', () => {
    const matches = [
      { date: '2026-10-10', time: '15:00' },
      { date: '2026-10-12', time: '10:00' },
    ]
    const { context, alerts } = adaptPlan(
      input({ today: '2026-10-11', matches, matchRatings: [{ date: '2026-10-10', minutesPlayed: 10, contactIntensity: null }] }),
    )
    expect(alerts.map((a) => a.code)).toContain('matchs-rapproches')
    expect(context.recoveryMode).toBe(true)
    expect(context.compensation).toBeUndefined()
    expect(context.extraMuscuSession).toBeUndefined()
    expect(context.reasons!.some((r) => r.code === 'mode-recuperation')).toBe(true)
  })

  it('mergeContexts garde le plafond de RPE le plus bas, les zones et la date de blocage la plus tardive', () => {
    const merged = mergeContexts([
      { maxTargetRpe: 8, painZones: ['genou'], blockHeavyLegsUntil: '2026-10-13', compensation: { '2026-10-11': 'courte' } },
      { maxTargetRpe: 7, painZones: ['cou'], blockHeavyLegsUntil: '2026-10-12', recoveryMode: true },
    ])
    expect(merged).toMatchObject({
      maxTargetRpe: 7,
      painZones: ['cou', 'genou'],
      blockHeavyLegsUntil: '2026-10-13',
      recoveryMode: true,
      compensation: { '2026-10-11': 'courte' },
    })
  })
})

describe('adaptation du plan : semaine générée', () => {
  const CLUB: ClubLite[] = [
    { weekday: 2, intensity: 'lourd', durationMin: 90 },
    { weekday: 4, intensity: 'normal', durationMin: 90 },
  ]
  const profile = { position: 9 as const, sex: 'homme' as const, liftingExperience: '6-24-mois' as const }
  const week = (over: Partial<BuildWeekInput> = {}) =>
    buildWeek({
      weekStart: MONDAY,
      today: MONDAY,
      profile,
      clubDays: CLUB,
      matches: [{ date: '2026-10-10', time: null }],
      cycleIndex: 0,
      ...over,
    })
  const sessions = (days: DayPlan[]) => days.flatMap((d) => (d.session ? [d.session] : []))
  const muscu = (days: DayPlan[]) => sessions(days).filter((s) => s.kind === 'muscu')
  const sets = (days: DayPlan[]) => sessions(days).reduce((n, s) => n + s.exercises.reduce((m, e) => m + e.prescription.sets, 0), 0)

  it('sous alerte : volume réduit, aucune série à RPE ≥ 9 et raison portée par chaque séance', () => {
    const baseWeek = week({ profile: { ...profile, liftingExperience: 'plus-24-mois' } })
    const ctx = adaptPlan({
      weekStart: MONDAY,
      today: TODAY,
      mornings: [...history(TODAY, 14), { date: TODAY, scores: scores(1, 1, 1, 1, 1), painZone: null }],
      matchRatings: [],
      loads: [],
      matches: [],
    }).context
    const light = week({ profile: { ...profile, liftingExperience: 'plus-24-mois' }, context: ctx })
    expect(sets(light.days)).toBeLessThan(sets(baseWeek.days) * 0.75)
    for (const s of sessions(light.days)) expect(s.maxRpe ?? 0).toBeLessThan(9)
    // sans le plafond, le niveau avancé prescrit bien du RPE ≥ 8 et la vitesse à 9 : le plafond a un effet
    expect(Math.max(...sessions(baseWeek.days).map((s) => s.maxRpe ?? 0))).toBeGreaterThanOrEqual(9)
    expect(muscu(light.days).every((s) => s.reasons.some((r) => r.code === 'ressenti-degrade' && r.source === 'ressenti'))).toBe(true)
  })

  it('sous alerte, le conditionnement intense d’une semaine sans match devient de l’aérobie léger et de la mobilité', () => {
    const noMatch = { matches: [] }
    const normal = week(noMatch)
    const cond = sessions(normal.days).find((s) => s.slot === 'conditionnement')!
    expect(cond.maxRpe).toBeGreaterThanOrEqual(7)
    const light = week({ ...noMatch, context: { lightConditioning: true, maxTargetRpe: 8, reasons: [{ code: 'x', text: 'x', source: 'ressenti' }] } })
    const lightCond = sessions(light.days).find((s) => s.slot === 'conditionnement')!
    expect(lightCond.title).toBe('Aérobie léger')
    expect(lightCond.maxRpe).toBeLessThanOrEqual(3)
    expect(lightCond.exercises.every((e) => ['aerobie-leger', 'mobilite-recuperation'].includes(getExercise(e.exerciseId)!.category))).toBe(true)
  })

  it('séance manquée : le lundi non fait n’est pas rattrapé, les jours restants sont inchangés', () => {
    const monday = week({ today: MONDAY })
    const missed = muscu(monday.days).find((s) => s.date === MONDAY || s.date < '2026-10-07')
    expect(missed).toBeDefined()
    // mardi : le lundi (non fait) est conservé tel quel
    const tuesday = week({ today: '2026-10-06', locked: monday.days.filter((d) => d.date < '2026-10-06') })
    expect(muscu(tuesday.days).length).toBe(muscu(monday.days).length)
    for (const d of tuesday.days.filter((x) => x.date >= '2026-10-06')) {
      expect(d.session?.exercises).toEqual(monday.days.find((x) => x.date === d.date)!.session?.exercises)
    }
    expect(sets(tuesday.days)).toBe(sets(monday.days))
    const missedDay = tuesday.days.find((d) => d.date === missed!.date)!
    expect(missedDay.session?.status).toBe('prevue')
    // le contexte n'a aucun champ de rattrapage quand aucune séance n'est enregistrée
    expect(adaptPlan({ weekStart: MONDAY, today: '2026-10-06', mornings: [], matchRatings: [], loads: [], matches: [] }).context).toEqual({})
  })

  it('douleur répétée : les exercices à fort impact sur la zone sont retirés (sprints et sauts sur les ischios)', () => {
    const impactful = (days: DayPlan[], zone: BodyZone) =>
      sessions(days)
        .flatMap((s) => s.exercises)
        .filter((e) => {
          const ex = getExercise(e.exerciseId)!
          return ex.impact === 'fort' && ex.zones.includes(zone)
        })
    const base = week({ profile: { ...profile, liftingExperience: 'plus-24-mois' } })
    expect(impactful(base.days, 'ischios').length).toBeGreaterThan(0)
    const protectedWeek = week({ profile: { ...profile, liftingExperience: 'plus-24-mois' }, context: { painZones: ['ischios'] } })
    expect(impactful(protectedWeek.days, 'ischios')).toEqual([])
    // un exercice sans fort impact sur la zone reste possible
    expect(muscu(protectedWeek.days).length).toBe(muscu(base.days).length)
  })

  it('blocage des jambes lourdes : la force du bas du corps n’est pas placée avant la date indiquée', () => {
    const noClub = { clubDays: [], matches: [{ date: '2026-10-10', time: null }] }
    const next = (context?: BuildWeekInput['context']) =>
      week({ ...noClub, weekStart: '2026-10-12', today: '2026-10-12', ...(context ? { context } : {}) })
    const date = (w: ReturnType<typeof next>) => sessions(w.days).find((s) => s.slot === 'bas-force')?.date
    const free = date(next())
    expect(free).toBeDefined()
    const blocked = date(next({ blockHeavyLegsUntil: '2026-10-16' }))
    expect(blocked === undefined || blocked > '2026-10-16').toBe(true)
    const none = date(next({ blockHeavyLegsUntil: '2026-10-11' }))
    expect(none).toBe(free)
  })
})

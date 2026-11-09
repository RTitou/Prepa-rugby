import { describe, expect, it } from 'vitest'
import { mergeContexts, type Orientation } from '../../src/engine/context'
import { proposeLevelUp } from '../../src/engine/progression/level'
import { analyzeRecords, type AnalysisProfile } from '../../src/engine/weaknesses/analyze'
import { classify, compareMass, compareRecord, type AvailableComparison, type PlayerContext } from '../../src/engine/weaknesses/compare'
import { orient } from '../../src/engine/weaknesses/orient'
import { composeSession, type ComposeInput } from '../../src/engine/week-builder/composeSession'
import type { PerformanceRecord, RecordTest, SquatVariant } from '../../src/types/records'

const TODAY = '2026-10-07'

let seq = 0
function rec(test: RecordTest, value: number, date: string, reps: number | null = null, variant?: SquatVariant): PerformanceRecord {
  seq += 1
  return {
    id: `r${seq}`,
    updatedAt: `2026-10-01T10:00:${String(seq % 60).padStart(2, '0')}.000Z`,
    deletedAt: null,
    test,
    value,
    unit: test === 'sprint-10m' || test === 'sprint-40m' || test === 'bronco' ? 's' : 'kg',
    reps,
    date,
    ...(variant ? { variant } : {}),
  }
}

const AVANT_FEDERALE: PlayerContext = { sex: 'homme', line: 'avants', level: 'federale' }
const AVANT: AnalysisProfile = { sex: 'homme', position: 1, level: 'federale', weightKg: 100 }

describe('classification (RC-3.2)', () => {
  it('z ≤ -1 en dessous, z ≥ +1 au-dessus, entre les deux dans la norme', () => {
    expect(classify(80, 100, 20, false)).toMatchObject({ status: 'en-dessous', method: 'z', z: -1 })
    expect(classify(120, 100, 20, false)).toMatchObject({ status: 'au-dessus', z: 1 })
    expect(classify(110, 100, 20, false).status).toBe('dans-la-norme')
  })

  it('inverse le signe pour un temps (plus bas = mieux)', () => {
    expect(classify(1.9, 1.8, 0.05, true)).toMatchObject({ status: 'en-dessous' })
    expect(classify(1.9, 1.8, 0.05, true).z).toBeCloseTo(-2, 6)
    expect(classify(1.7, 1.8, 0.05, true).status).toBe('au-dessus')
  })

  it('sans écart-type, compare en % de la moyenne avec le seuil de 10 %', () => {
    expect(classify(89, 100, undefined, false)).toMatchObject({ status: 'en-dessous', method: 'percent', z: null })
    expect(classify(111, 100, undefined, false).status).toBe('au-dessus')
    expect(classify(95, 100, undefined, false).status).toBe('dans-la-norme')
    expect(classify(1.11, 1, undefined, true).status).toBe('en-dessous')
  })
})

describe('comparaison au niveau au-dessus (RC-3.1, 3.3, 3.4)', () => {
  it('avant fédérale : repère nationale, force rapportée au poids de corps, sans écart-type -> %', () => {
    const a = compareRecord(AVANT_FEDERALE, rec('squat', 120, '2026-09-01', 1), 100) as AvailableComparison
    expect(a.available).toBe(true)
    expect(a.targetLevel).toBe('nationale')
    expect(a.norm.protocol.id).toBe('back-squat-1rm-rel')
    expect(a.value).toBeCloseTo(1.2, 6)
    expect(a.method).toBe('percent')
    expect(a.status).toBe('en-dessous')
    expect(a.estimate).toBe(true)
    expect(a.source?.authors).toContain('Owen')
  })

  it('utilise le poids de corps passé : le même squat donne un autre écart', () => {
    const light = compareRecord(AVANT_FEDERALE, rec('squat', 120, '2026-09-01', 1), 70) as AvailableComparison
    expect(light.value).toBeCloseTo(120 / 70, 6)
    expect(light.status).toBe('au-dessus')
  })

  it('sprint : z inversé avec écart-type', () => {
    const slow = compareRecord(AVANT_FEDERALE, rec('sprint-10m', 1.95, '2026-09-01'), 100) as AvailableComparison
    expect(slow.method).toBe('z')
    expect(slow.status).toBe('en-dessous')
    const ok = compareRecord(AVANT_FEDERALE, rec('sprint-10m', 1.85, '2026-09-01'), 100) as AvailableComparison
    expect(ok.status).toBe('dans-la-norme')
    expect(ok.z).toBeCloseTo(-0.3, 6)
    const fast = compareRecord(AVANT_FEDERALE, rec('sprint-10m', 1.7, '2026-09-01'), 100) as AvailableComparison
    expect(fast.status).toBe('au-dessus')
  })

  it('front squat : ne compare que le protocole compatible, 3RM ≈ 0,91 × 1RM estimé', () => {
    const c = compareRecord(AVANT_FEDERALE, rec('squat', 100, '2026-09-01', 3, 'front-squat'), 100) as AvailableComparison
    expect(c.norm.protocol.id).toBe('front-squat-3rm-rel')
    expect(c.value).toBeCloseTo((100 * 1.1 * 0.91) / 100, 6)
  })

  it('protocole incompatible : pas de repère pour ce protocole', () => {
    // Niveau pro : seul le back squat a un repère, pas le front squat.
    const c = compareRecord({ sex: 'homme', line: 'avants', level: 'espoirs' }, rec('squat', 150, '2026-09-01', 1, 'front-squat'), 100)
    expect(c).toMatchObject({ available: false, reason: 'protocole-incompatible', message: 'Pas de repère pour ce protocole.' })
  })

  it('au plus haut niveau, le joueur est comparé à son propre niveau', () => {
    const c = compareRecord({ sex: 'homme', line: 'avants', level: 'pro' }, rec('sprint-10m', 1.78, '2026-09-01'), 100) as AvailableComparison
    expect(c.targetLevel).toBe('pro')
    expect(c.status).toBe('dans-la-norme')
  })

  it('pas de 40 m chez les pros : progression seule', () => {
    const c = compareRecord({ sex: 'homme', line: 'avants', level: 'pro' }, rec('sprint-40m', 5.4, '2026-09-01'), 100)
    expect(c).toMatchObject({ available: false, reason: 'pas-de-repere' })
  })

  it('Bronco : progression personnelle seule', () => {
    const c = compareRecord(AVANT_FEDERALE, rec('bronco', 292, '2026-09-01'), 100)
    expect(c).toMatchObject({ available: false, reason: 'bronco' })
  })

  it('joueuse : progression seule, mention « repères à venir »', () => {
    const c = compareRecord({ sex: 'femme', line: 'arrieres', level: 'federale' }, rec('sprint-10m', 1.9, '2026-09-01'), 65)
    expect(c.available).toBe(false)
    expect(!c.available && c.message).toMatch(/Repères à venir/)
  })

  it('régional : repère de fédérale (estimation) ; loisir : repli sur la fédérale marqué', () => {
    const reg = compareRecord({ sex: 'homme', line: 'avants', level: 'regional' }, rec('sprint-10m', 1.9, '2026-09-01'), 100) as AvailableComparison
    expect(reg.targetLevel).toBe('federale')
    expect(reg.estimate).toBe(true)
    const loisir = compareRecord({ sex: 'homme', line: 'avants', level: 'loisir' }, rec('sprint-10m', 1.9, '2026-09-01'), 100) as AvailableComparison
    expect(loisir.targetLevel).toBe('federale')
    expect(loisir.fallbackLevel).toBe(true)
  })

  it('signale les valeurs à revérifier', () => {
    const c = compareRecord(AVANT_FEDERALE, rec('sprint-10m', 1.85, '2026-09-01'), 100) as AvailableComparison
    expect(c.toVerify).toBe(true)
  })

  it('le poids de corps n’est pas comparé', () => {
    expect(compareRecord(AVANT_FEDERALE, rec('poids', 100, '2026-09-01'), 100)).toMatchObject({ available: false, reason: 'poids' })
  })

  it('masse : repère de la ligne au niveau au-dessus, aucun pour les joueuses', () => {
    expect(compareMass(AVANT_FEDERALE, 85)).toMatchObject({ status: 'en-dessous', meanKg: 105, targetLevel: 'nationale' })
    expect(compareMass({ sex: 'femme', line: 'avants', level: 'federale' }, 60)).toBeUndefined()
  })
})

describe('analyse et orientation (RC-5.5, RC-3.5)', () => {
  it('avant 100 kg, squat 120 kg et 10 m en 1,85 s : force relative faible -> bloc force', () => {
    const a = analyzeRecords(AVANT, [rec('squat', 120, '2026-09-01', 1), rec('sprint-10m', 1.85, '2026-09-01')], TODAY)
    expect(a.orientation?.focus).toBe('force')
    expect(a.orientation?.reason).toMatch(/force relative/)
    expect(a.series.map((s) => s.key).sort()).toEqual(['sprint-10m', 'squat:back-squat'])
  })

  it('squat 130 kg × 5 : 1RM estimé, courbe et force correcte', () => {
    const a = analyzeRecords(
      AVANT,
      [rec('squat', 120, '2026-09-01', 1), rec('squat', 130, '2026-10-05', 5), rec('sprint-10m', 1.85, '2026-09-01')],
      TODAY,
    )
    const squat = a.series.find((s) => s.key === 'squat:back-squat')!
    expect(squat.latestOneRepMax).toBeCloseTo(151.667, 3)
    expect(squat.curve).toHaveLength(2)
    expect(squat.curve[0]).toBe(120)
    expect(a.orientation).toBeNull()
  })

  it('le dernier poids saisi remplace le poids du profil pour la force relative', () => {
    const a = analyzeRecords(AVANT, [rec('squat', 140, '2026-09-01', 1), rec('poids', 90, '2026-09-02')], TODAY)
    expect(a.bodyweightKg).toBe(90)
    expect((a.series.find((s) => s.test === 'squat')!.comparison as AvailableComparison).value).toBeCloseTo(140 / 90, 6)
  })

  it('force correcte mais 10 m lent -> puissance et vitesse', () => {
    const a = analyzeRecords(AVANT, [rec('squat', 150, '2026-09-01', 1), rec('sprint-10m', 1.97, '2026-09-01')], TODAY)
    expect(a.orientation).toMatchObject({ focus: 'puissance-vitesse', weakness: 'vitesse' })
  })

  it('10 m lent sans aucune donnée de force : pas de conclusion', () => {
    expect(analyzeRecords(AVANT, [rec('sprint-10m', 1.97, '2026-09-01')], TODAY).orientation).toBeNull()
  })

  it('masse faible pour le poste -> hypertrophie, force et vitesse correctes', () => {
    const a = analyzeRecords({ ...AVANT, weightKg: 85 }, [rec('squat', 130, '2026-09-01', 1), rec('sprint-10m', 1.83, '2026-09-01')], TODAY)
    expect(a.orientation).toMatchObject({ focus: 'hypertrophie', weakness: 'masse' })
  })

  it('priorité : la force passe avant la vitesse, la vitesse avant la masse', () => {
    const base = { ...AVANT, weightKg: 85 }
    const all = analyzeRecords(base, [rec('squat', 100, '2026-09-01', 1), rec('sprint-10m', 1.99, '2026-09-01')], TODAY)
    expect(all.orientation?.focus).toBe('force')
    const noForce = analyzeRecords(base, [rec('squat', 130, '2026-09-01', 1), rec('sprint-10m', 1.99, '2026-09-01')], TODAY)
    expect(noForce.orientation?.focus).toBe('puissance-vitesse')
  })

  it('RC-3.5 : masse +2 % et 10 m +0,03 s en 6 semaines -> vitesse, sans faiblesse de force', () => {
    const a = analyzeRecords(
      AVANT,
      [
        rec('poids', 100, '2026-08-27'),
        rec('poids', 103, '2026-10-05'),
        rec('sprint-10m', 1.82, '2026-08-27'),
        rec('sprint-10m', 1.87, '2026-10-05'),
        // Force relative en baisse apparente à cause de la masse : ne doit pas être conclue comme faiblesse.
        rec('squat', 125, '2026-10-05', 1),
      ],
      TODAY,
    )
    expect(a.massGainPct).toBeCloseTo(3, 6)
    expect(a.sprint10Delta).toBeCloseTo(0.05, 6)
    expect(a.orientation?.focus).toBe('vitesse')
    expect(a.orientation?.reason).toMatch(/sans conclure à un manque de force/)
  })

  it('RC-3.5 : seuils stricts et fenêtre de 6 semaines', () => {
    const edge = analyzeRecords(
      AVANT,
      [rec('poids', 100, '2026-08-27'), rec('poids', 102, '2026-10-05'), rec('sprint-10m', 1.82, '2026-08-27'), rec('sprint-10m', 1.85, '2026-10-05')],
      TODAY,
    )
    expect(edge.orientation?.focus).not.toBe('vitesse')
    const old = analyzeRecords(
      AVANT,
      [rec('poids', 100, '2026-06-01'), rec('poids', 105, '2026-10-05'), rec('sprint-10m', 1.8, '2026-06-01'), rec('sprint-10m', 1.9, '2026-10-05')],
      TODAY,
    )
    expect(old.massGainPct).toBeNull()
    expect(old.orientation?.focus).not.toBe('vitesse')
  })

  it('Bronco seul et joueuse : aucune orientation, progression seule', () => {
    expect(analyzeRecords(AVANT, [rec('bronco', 300, '2026-09-01')], TODAY).orientation).toBeNull()
    const woman = analyzeRecords(
      { sex: 'femme', position: 9, level: 'federale', weightKg: 65 },
      [rec('squat', 40, '2026-09-01', 1), rec('sprint-10m', 2.2, '2026-09-01')],
      TODAY,
    )
    expect(woman.orientation).toBeNull()
    expect(woman.levelProposal).toBeNull()
    expect(woman.series.every((s) => !s.comparison.available)).toBe(true)
  })

  it('est déterministe, quel que soit l’ordre des records', () => {
    const records = [rec('squat', 120, '2026-09-01', 1), rec('sprint-10m', 1.85, '2026-09-01')]
    expect(analyzeRecords(AVANT, records, TODAY)).toEqual(analyzeRecords(AVANT, [...records].reverse(), TODAY))
  })

  it('orient sans aucune donnée renvoie null', () => {
    expect(orient({ comparisons: [], mass: undefined, massGainPct: null, sprint10Delta: null })).toBeNull()
  })
})

describe('niveau réévalué par les records', () => {
  const strongAvant = [rec('squat', 160, '2026-09-01', 1), rec('sprint-10m', 1.7, '2026-09-01'), rec('sprint-40m', 5.4, '2026-09-01')]

  it('propose le niveau suivant quand au moins deux tests atteignent le repère, sans rien changer seul', () => {
    expect(analyzeRecords(AVANT, strongAvant, TODAY).levelProposal).toBe('nationale')
  })

  it('ne propose rien avec un seul test, un test en dessous, ou sans repère', () => {
    expect(analyzeRecords(AVANT, [rec('squat', 160, '2026-09-01', 1)], TODAY).levelProposal).toBeNull()
    expect(analyzeRecords(AVANT, [...strongAvant, rec('sprint-40m', 6.2, '2026-09-02')], TODAY).levelProposal).toBeNull()
    expect(analyzeRecords({ ...AVANT, level: 'pro' }, strongAvant, TODAY).levelProposal).toBeNull()
    expect(analyzeRecords({ ...AVANT, level: 'loisir' }, strongAvant, TODAY).levelProposal).toBeNull()
  })

  it('proposeLevelUp ignore les comparaisons indisponibles', () => {
    expect(proposeLevelUp('federale', [{ available: false, test: 'bronco', reason: 'bronco', message: '' }])).toBeNull()
  })
})

describe('orientation dans les séances', () => {
  const base: ComposeInput = {
    date: '2026-10-07',
    slot: 'bas-force',
    index: 0,
    profile: { position: 1, sex: 'homme', liftingExperience: '6-24-mois' },
    rotation: 41,
    deload: false,
    includeSpeed: true,
  }
  const orientation = (focus: Orientation['focus']): Orientation => ({ focus, weakness: 'test', reason: `Raison ${focus}` })
  const sets = (s: ReturnType<typeof composeSession>, block: string) =>
    s.exercises.filter((e) => e.block === block).reduce((n, e) => n + e.prescription.sets, 0)

  it('force : une série de plus sur les exercices principaux et la raison affichée (source records)', () => {
    const plain = composeSession(base)
    const forced = composeSession({ ...base, context: { orientation: orientation('force') } })
    expect(sets(forced, 'force')).toBeGreaterThan(sets(plain, 'force'))
    expect(forced.reasons.find((x) => x.source === 'records')).toMatchObject({ code: 'orientation-force', text: 'Raison force' })
    expect(plain.reasons.some((x) => x.source === 'records')).toBe(false)
  })

  it('hypertrophie : 3-4 séries de 8 à 12 sur le secondaire et l’accessoire', () => {
    const s = composeSession({ ...base, slot: 'haut', context: { orientation: orientation('hypertrophie') } })
    const hyper = s.exercises.filter((e) => e.prescription.repsMax === 12 && e.prescription.reps === 8)
    expect(hyper.length).toBeGreaterThan(0)
    for (const e of hyper) expect(e.prescription.sets).toBeGreaterThanOrEqual(3)
  })

  it('puissance-vitesse et vitesse : plus de sprints ; la puissance gagne une série', () => {
    const plain = composeSession({ ...base, slot: 'haut' })
    const speed = composeSession({ ...base, slot: 'haut', context: { orientation: orientation('vitesse') } })
    expect(sets(speed, 'vitesse')).toBeGreaterThan(sets(plain, 'vitesse'))
    expect(sets(speed, 'force')).toBe(sets(plain, 'force'))
    const profile = { ...base.profile, liftingExperience: 'plus-24-mois' as const }
    const power = composeSession({ ...base, slot: 'puissance', profile, context: { orientation: orientation('puissance-vitesse') } })
    const powerPlain = composeSession({ ...base, slot: 'puissance', profile })
    expect(sets(power, 'puissance')).toBeGreaterThan(sets(powerPlain, 'puissance'))
  })

  it('est déterministe et mergeContexts garde l’orientation la plus prioritaire', () => {
    const ctx = { orientation: orientation('force') }
    expect(composeSession({ ...base, context: ctx })).toEqual(composeSession({ ...base, context: ctx }))
    expect(mergeContexts([{ orientation: orientation('hypertrophie') }, { orientation: orientation('force') }]).orientation?.focus).toBe('force')
    expect(mergeContexts([{ orientation: orientation('force') }, { orientation: orientation('vitesse') }]).orientation?.focus).toBe('vitesse')
    expect(mergeContexts([{}]).orientation).toBeUndefined()
  })
})

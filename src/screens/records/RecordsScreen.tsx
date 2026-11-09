import { useState, type FormEvent } from 'react'
import Sparkline from '../../components/Sparkline'
import { useProfile, useRecords, useRecordsAnalysis } from '../../data/hooks'
import { atpReview, lateralAsymmetry } from '../../engine/atpReview'
import type { PerformanceRecord } from '../../types/records'
import { todayLocal } from '../../data/ids'
import { saveProfile } from '../../data/repositories/profileRepo'
import { addRecord } from '../../data/repositories/recordsRepo'
import { estimateOneRepMax, isImpreciseEstimate } from '../../engine/progression/oneRepMax'
import type { Analysis, Series } from '../../engine/weaknesses/analyze'
import type { AvailableComparison, Comparison } from '../../engine/weaknesses/compare'
import { dayMonthShort } from '../../lib/format'
import { formatRecordValue, parseDecimal, parseDuration } from '../../lib/numbers'
import { PLAY_LEVELS, type PlayLevel, type Profile } from '../../types/profile'
import { ALL_RECORD_TESTS, SQUAT_VARIANTS, getRecordTest, type PerformanceRecordInput, type RecordTest, type SquatVariant } from '../../types/records'

const fr = (n: number, digits: number): string => n.toFixed(digits).replace('.', ',')
const levelLabel = (level: PlayLevel): string => PLAY_LEVELS.find((l) => l.value === level)?.label ?? level

function GapLine({ comparison }: { comparison: Comparison }) {
  if (!comparison.available) return <p className="muted record-gap">{comparison.message}</p>
  return <AvailableGap comparison={comparison} />
}

function AvailableGap({ comparison: c }: { comparison: AvailableComparison }) {
  const gap = c.z !== null ? fr(c.z, 1) : `${fr(c.deltaPct, 0)} %`
  const signed = c.deltaPct >= 0 && !gap.startsWith('-') ? `+${gap}` : gap
  const mark = c.status === 'en-dessous' ? '▼' : c.status === 'au-dessus' ? '▲' : '●'
  const word = c.status === 'en-dessous' ? 'en dessous' : c.status === 'au-dessus' ? 'au-dessus' : 'dans la norme'
  const modifier = c.status === 'en-dessous' ? 'below' : c.status === 'au-dessus' ? 'above' : 'ok'
  const unit = c.norm.unit
  return (
    <>
      <p className={`record-gap record-gap--${modifier}`}>
        vs niveau sup. ({levelLabel(c.targetLevel)}) : {signed}
        {c.z !== null ? ' écart-type' : ''} {mark} <span>{word}</span>
        {c.estimate ? ' · estimation' : ''}
        {c.toVerify ? ' · à revérifier' : ''}
      </p>
      <details className="record-source">
        <summary>Source du repère</summary>
        <p>
          Repère : {fr(c.norm.mean, 2)} {unit}
          {c.norm.sd !== undefined ? ` ± ${fr(c.norm.sd, 2)}` : ' (écart-type inconnu, comparaison en % de la moyenne)'} · ton niveau : {fr(c.value, 2)} {unit}
        </p>
        <p>{c.norm.protocol.description}</p>
        <p>
          {c.source ? `${c.source.authors}${c.source.year ? ` (${c.source.year})` : ''}. ${c.source.title}.` : c.norm.sourceId}
          {c.estimate ? ' Rattaché par proximité : aucune donnée publiée pour ce niveau.' : ''}
          {c.toVerify ? ' Valeur à revérifier sur la publication originale.' : ''}
          {c.fallbackLevel ? ' Repère de fédérale utilisé faute de repère plus bas.' : ''}
        </p>
      </details>
    </>
  )
}

function SeriesCard({ series }: { series: Series }) {
  const { latest } = series
  const trend = `Courbe ${series.label} : ${series.curve.length} valeur${series.curve.length > 1 ? 's' : ''}`
  return (
    <section className="card" aria-label={series.label}>
      <div className="record-card__head">
        <div>
          <h2>{series.label}</h2>
          <p className="record-card__value">
            {formatRecordValue(latest.value, latest.unit, latest.reps)} <span className="muted">· {dayMonthShort(latest.date)}</span>
          </p>
          {series.latestOneRepMax !== null ? (
            <p className="muted">
              1RM estimé : {fr(series.latestOneRepMax, 1)} kg
              {latest.reps !== null && isImpreciseEstimate(latest.reps) ? ' (imprécis au-delà de 10 répétitions)' : ''}
            </p>
          ) : null}
        </div>
        <Sparkline values={series.curve} label={trend} lowerIsBetter={series.lowerIsBetter} />
      </div>
      <GapLine comparison={series.comparison} />
    </section>
  )
}

function AddForm({ onDone, bodyweight }: { onDone: () => void; bodyweight: number }) {
  const [test, setTest] = useState<RecordTest>('squat')
  const [variant, setVariant] = useState<SquatVariant>('back-squat')
  const [load, setLoad] = useState('')
  const [reps, setReps] = useState('1')
  const [time, setTime] = useState('')
  const [date, setDate] = useState(todayLocal())
  const [error, setError] = useState<string | null>(null)
  const def = getRecordTest(test)

  const loadValue = parseDecimal(load)
  const repsValue = /^\d+$/.test(reps.trim()) ? Number(reps) : null
  const preview =
    def.kind === 'load' && loadValue !== null && loadValue > 0 && repsValue !== null && repsValue >= 1 ? estimateOneRepMax(loadValue, repsValue) : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    let input: PerformanceRecordInput
    if (def.kind === 'load') {
      if (loadValue === null || loadValue <= 0 || loadValue > 600) return setError('Charge invalide (en kg).')
      if (repsValue === null || repsValue < 1 || repsValue > 50) return setError('Nombre de répétitions invalide (1 à 50).')
      input = { test, value: loadValue, unit: 'kg', reps: repsValue, date, ...(test === 'squat' ? { variant } : {}) }
    } else if (def.kind === 'time') {
      const seconds = parseDuration(time)
      if (seconds === null || seconds <= 0) return setError('Temps invalide (par exemple 1,85 ou 4:52).')
      input = { test, value: seconds, unit: 's', reps: null, date }
    } else if (def.kind === 'distance') {
      if (loadValue === null || loadValue < 10 || loadValue > 400) return setError('Distance invalide (en cm, par exemple 245).')
      input = { test, value: loadValue, unit: 'cm', reps: null, date }
    } else {
      if (loadValue === null || loadValue < 30 || loadValue > 250) return setError('Poids invalide (en kg).')
      input = { test, value: loadValue, unit: 'kg', reps: null, date }
    }
    if (date > todayLocal()) return setError('La date ne peut pas être dans le futur.')
    try {
      await addRecord(input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    }
  }

  return (
    <form className="card record-form" onSubmit={(e) => void submit(e)} aria-label="Ajouter un record">
      <div className="field">
        <label htmlFor="rec-test">Test</label>
        <select id="rec-test" value={test} onChange={(e) => setTest(e.target.value as RecordTest)}>
          {ALL_RECORD_TESTS.map((t) => (
            <option key={t.test} value={t.test}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {test === 'squat' ? (
        <div className="field">
          <label htmlFor="rec-variant">Exercice</label>
          <select id="rec-variant" value={variant} onChange={(e) => setVariant(e.target.value as SquatVariant)}>
            {SQUAT_VARIANTS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {def.kind === 'time' ? (
        <div className="field">
          <label htmlFor="rec-time">Temps (s ou m:ss)</label>
          <input id="rec-time" type="text" inputMode="decimal" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      ) : (
        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-load">{def.kind === 'weight' ? 'Poids (kg)' : def.kind === 'distance' ? 'Distance (cm)' : 'Charge (kg)'}</label>
            <input id="rec-load" type="text" inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} />
          </div>
          {def.kind === 'load' ? (
            <div className="field">
              <label htmlFor="rec-reps">Répétitions</label>
              <input id="rec-reps" type="number" inputMode="numeric" min={1} value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
          ) : null}
        </div>
      )}
      {preview !== null ? (
        <p className="muted" role="status">
          1RM estimé (Epley) : {fr(preview, 1)} kg
          {repsValue !== null && isImpreciseEstimate(repsValue) ? ' · imprécis au-delà de 10 répétitions' : ''}
          {bodyweight > 0 ? ` · ${fr(preview / bodyweight, 2)} × ton poids de corps` : ''}
        </p>
      ) : null}
      <div className="field">
        <label htmlFor="rec-date">Date</label>
        <input id="rec-date" type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error ? (
        <p className="banner banner--warn" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn">
        Enregistrer
      </button>
    </form>
  )
}

function signed(n: number, digits: number): string {
  const s = fr(Math.abs(n), digits)
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s
}

/** Bilan des tests de l'intersaison ATP (S1 / S9) et asymétrie gauche / droite du saut latéral. */
function AtpReview({ profile, records }: { profile: Profile; records: PerformanceRecord[] }) {
  const phase = profile.trainingPhase
  const asym = lateralAsymmetry(records)
  if (phase?.kind !== 'intersaison' && !asym) return null
  const rows = phase?.kind === 'intersaison' ? atpReview(records, phase.startMonday) : []
  const any = rows.some((r) => r.s1 || r.s9)
  return (
    <section className="card" aria-labelledby="h-bilan">
      <h2 id="h-bilan">Bilan de l’intersaison</h2>
      {phase?.kind === 'intersaison' ? (
        any ? (
          <ul className="record-list review-list">
            {rows
              .filter((r) => r.s1 || r.s9)
              .map((r) => (
                <li key={r.test}>
                  <span>{r.label}</span>
                  <span>
                    {r.s1 ? formatRecordValue(r.s1.value, r.s1.unit, r.s1.reps) : '–'} → {r.s9 ? formatRecordValue(r.s9.value, r.s9.unit, r.s9.reps) : '–'}
                    {r.delta !== null ? (
                      <strong className={r.improved ? 'record-gap--above' : 'record-gap--below'}>
                        {' '}
                        ({signed(r.delta, r.unit === 's' ? 2 : r.unit === 'cm' ? 0 : 1)} {r.unit}
                        {r.viaOneRm ? ', 1RM estimé' : ''})
                      </strong>
                    ) : null}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="muted">Note tes tests de la semaine 1 (et de la semaine 9) pour voir ton bilan ici.</p>
        )
      ) : null}
      {asym ? (
        <p className={asym.pct > 10 ? 'record-gap record-gap--below' : 'record-gap record-gap--ok'}>
          Saut latéral : gauche {fr(asym.left, 0)} cm, droite {fr(asym.right, 0)} cm · écart {fr(asym.pct, 0)} %
          {asym.weaker ? ` (jambe ${asym.weaker} plus faible)` : ''}
          {asym.pct > 10 ? ' : au-delà de 10 %, travaille la jambe la plus faible.' : ''}
        </p>
      ) : null}
    </section>
  )
}

function WeakPoint({ analysis, profile }: { analysis: Analysis; profile: Profile }) {
  const next = analysis.levelProposal
  const weakness = analysis.orientation?.weakness
  return (
    <>
      <section className="card" aria-labelledby="h-point-faible">
        <h2 id="h-point-faible">Point faible</h2>
        {analysis.orientation && weakness ? (
          <>
            <p className="card__title">{weakness.charAt(0).toUpperCase() + weakness.slice(1)}</p>
            <p>{analysis.orientation.reason}</p>
            <p className="muted">→ Tes prochaines séances sont orientées en conséquence.</p>
          </>
        ) : (
          <p className="muted">Aucun point faible détecté pour l’instant. Ajoute des records pour affiner l’analyse.</p>
        )}
      </section>
      {next ? (
        <section className="banner banner--info" aria-label="Changement de niveau">
          <p>
            Tes records atteignent les repères du niveau {levelLabel(next)}. Tu peux passer à ce niveau : tes comparaisons utiliseront alors le niveau
            suivant.
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void saveProfile({
                age: profile.age,
                sex: profile.sex,
                position: profile.position,
                heightCm: profile.heightCm,
                weightKg: profile.weightKg,
                level: next,
                liftingExperience: profile.liftingExperience,
              })
            }}
          >
            Passer au niveau {levelLabel(next)}
          </button>
        </section>
      ) : null}
    </>
  )
}

export default function RecordsScreen() {
  const profile = useProfile()
  const analysis = useRecordsAnalysis()
  const records = useRecords()
  const [adding, setAdding] = useState(false)

  if (analysis === undefined || profile === undefined) {
    return (
      <section className="screen">
        <h1>Records</h1>
        <p className="muted">Chargement…</p>
      </section>
    )
  }
  if (analysis === null || !profile) {
    return (
      <section className="screen">
        <h1>Records</h1>
        <p className="muted">Crée d’abord ton profil pour suivre tes records.</p>
      </section>
    )
  }
  return (
    <section className="screen">
      <div className="record-card__head">
        <h1>Records</h1>
        <button type="button" className="btn btn--small" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
          {adding ? 'Fermer' : '+ Ajouter'}
        </button>
      </div>
      {profile.sex === 'femme' ? <p className="banner banner--info">Repères à venir pour les joueuses : seule ta progression personnelle est suivie.</p> : null}
      {adding ? <AddForm bodyweight={analysis.bodyweightKg} onDone={() => setAdding(false)} /> : null}
      {analysis.series.length === 0 ? <p className="muted">Aucun record pour l’instant. Ajoute ton premier résultat.</p> : null}
      {records ? <AtpReview profile={profile} records={records} /> : null}
      {analysis.series.map((s) => (
        <SeriesCard key={s.key} series={s} />
      ))}
      <WeakPoint analysis={analysis} profile={profile} />
    </section>
  )
}

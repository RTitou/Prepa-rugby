import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { usePlayerMaxes, useSessionById } from '../../data/hooks'
import { LOAD_BASE_LABEL, LOAD_RATIOS, suggestSetLoad, type PlayerMaxes, type SuggestedLoad } from '../../engine/progression/suggestedLoad'
import { finishSessionLog, saveSessionLog, type SessionLogDraft } from '../../data/repositories/sessionLogRepo'
import { formatPct, formatPrescription, formatRest } from '../../lib/format'
import { parseDecimal } from '../../lib/numbers'
import Icon from '../../components/Icon'
import { getWarmup } from '../../reference/activate/warmup'
import { getExercise } from '../../reference/exercises/library'
import { BODY_ZONES } from '../../types/reference'
import { getRecordTest } from '../../types/records'
import type { BlockLetter, LoggedSet, PrescribedExercise, Session, SessionLog, WaveSet } from '../../types/plan'

function zoneLabel(zone: string): string {
  return BODY_ZONES.find((z) => z.value === zone)?.label ?? zone
}

interface SetDraft {
  load: string
  reps: string
  rpe: string
  done: boolean
}

interface FormState {
  warmupDone: boolean
  sets: Record<string, SetDraft[]>
}

const EMPTY_SET: SetDraft = { load: '', reps: '', rpe: '', done: false }

/** Titre d'un bloc ATP selon sa lettre. */
const BLOCK_TITLES: Record<BlockLetter, string> = {
  A: 'Échauffement',
  B: 'Puissance',
  C: 'Force',
  D: 'Renforcement',
  E: 'Renforcement',
  F: 'Finisher',
}
const LETTERS: readonly BlockLetter[] = ['A', 'B', 'C', 'D', 'E', 'F']

/** Série commencée : cochée, ou charge ou répétitions saisies. Sert à la barre de progression. */
function isFilled(row: SetDraft): boolean {
  return row.done || row.load.trim() !== '' || row.reps.trim() !== ''
}

function text(n: number | null): string {
  return n === null ? '' : String(n).replace('.', ',')
}

/** Répétitions visées, en indication dans le champ (« 5 », « 8-10 », reps de la série de la vague). */
function targetReps(e: PrescribedExercise, index: number): string {
  const p = e.prescription
  const wave = p.waves?.[index]
  if (wave) return String(wave.reps)
  return p.repsMax !== undefined ? `${p.reps}-${p.repsMax}` : String(p.reps)
}

/** Série saisie avec la charge et les répétitions : seuls ces exercices ont des champs numériques. */
function isLoadExercise(e: PrescribedExercise): boolean {
  return e.prescription.unit === 'reps' && e.prescription.targetRpe !== null
}

function initialState(session: Session, log: SessionLog | null): FormState {
  const sets: Record<string, SetDraft[]> = {}
  for (const e of session.exercises) {
    sets[e.exerciseId] = Array.from({ length: e.prescription.sets }, (_, i) => {
      const saved = log?.sets.find((s) => s.exerciseId === e.exerciseId && s.setIndex === i + 1)
      return saved ? { load: text(saved.loadKg), reps: text(saved.reps), rpe: text(saved.rpe), done: saved.done } : { ...EMPTY_SET }
    })
  }
  return { warmupDone: log?.warmupDone ?? false, sets }
}

function toLoggedSets(session: Session, state: FormState): LoggedSet[] {
  const out: LoggedSet[] = []
  for (const e of session.exercises) {
    ;(state.sets[e.exerciseId] ?? []).forEach((s, i) => {
      const loadKg = parseDecimal(s.load)
      const reps = parseDecimal(s.reps)
      const rpe = parseDecimal(s.rpe)
      if (loadKg === null && reps === null && rpe === null && !s.done) return
      out.push({ exerciseId: e.exerciseId, setIndex: i + 1, loadKg, reps: reps === null ? null : Math.round(reps), rpe, done: s.done })
    })
  }
  return out
}

/** Charge conseillée d'un exercice, ou invitation à saisir le record qui la permettrait. */
function LoadHint({ exercise, load }: { exercise: PrescribedExercise; load: SuggestedLoad | null }) {
  if (load) {
    const hand = load.perHand ? ' par main' : ''
    return (
      <p className="load-hint">
        <span className="load-hint__value">
          {text(load.kg)} kg{hand}
        </span>
        <span className="load-hint__basis">
          {Math.round(load.pct * 100)} % de ton max ({Math.round(load.maxKg)} kg{hand}, d’après {load.basis})
        </span>
      </p>
    )
  }
  const ratio = LOAD_RATIOS[exercise.exerciseId]
  if (!ratio || exercise.prescription.targetRpe === null) return null
  return (
    <p className="load-hint load-hint--missing">
      <Link to="/records">Ajoute ton record de {LOAD_BASE_LABEL[ratio.base]}</Link> pour avoir une charge conseillée.
    </p>
  )
}

/** Libellé d'une série de vague : reps, % du 1RM ou du top set, ou « au max ». */
function waveLabel(w: WaveSet): string {
  if (w.toMax) return `${w.reps} · au max`
  if (w.pctTopSet) return `${w.reps} · ${formatPct(w.pctTopSet)} du top set`
  if (w.pctOneRm) return `${w.reps} · ${formatPct(w.pctOneRm)}`
  return w.rpe !== undefined ? `${w.reps} · RPE ${text(w.rpe)}` : String(w.reps)
}

interface CardProps {
  exercise: PrescribedExercise
  label: string
  rows: SetDraft[]
  maxes: PlayerMaxes | undefined
  finished: boolean
  onChange: (index: number, patch: Partial<SetDraft>) => void
}

function ExerciseCard({ exercise: e, label, rows, maxes, finished, onChange }: CardProps) {
  const ex = getExercise(e.exerciseId)
  const name = ex?.name ?? e.exerciseId
  const loaded = isLoadExercise(e)
  const waves = e.prescription.waves
  // Back-off : la charge saisie sur le top set (première série) sert de base.
  const topSetKg = waves ? parseDecimal(rows[0]?.load ?? '') : null
  const setLoad = (i: number) => (maxes && loaded ? suggestSetLoad(e.exerciseId, e.prescription, i, maxes, topSetKg) : null)
  const headline = maxes && loaded && !waves ? setLoad(0) : null
  const replaced = e.replaces ? (getExercise(e.replaces.exerciseId)?.name ?? e.replaces.exerciseId) : null
  const complete = rows.length > 0 && rows.every(isFilled)
  return (
    <section className={complete ? 'card exercise exercise--complete' : 'card exercise'} aria-label={name}>
      <div className="exercise__head">
        <span className="exercise__index" aria-hidden="true">
          {complete ? '✓' : label}
        </span>
        <h3 className="exercise__name">{name}</h3>
        <span className="exercise__rx">{formatPrescription(e.prescription)}</span>
      </div>
      {maxes && loaded && !waves ? <LoadHint exercise={e} load={headline} /> : null}
      {maxes && loaded && waves && LOAD_RATIOS[e.exerciseId] && waves.some((w) => w.pctOneRm) && !waves.some((_, i) => setLoad(i)) ? (
        <LoadHint exercise={e} load={null} />
      ) : null}
      {e.note ? <p className="reason">{e.note}</p> : null}
      {replaced ? (
        <p className="reason">
          ⓘ remplace {replaced}
          {e.replaces?.zone ? ` (${zoneLabel(e.replaces.zone)})` : ''}
        </p>
      ) : null}
      {ex ? (
        <details>
          <summary>Consignes</summary>
          <p>{ex.instructions}</p>
        </details>
      ) : null}
      {loaded && rows.length > 0 ? (
        <div className="set-row set-row--head" aria-hidden="true">
          <span className="set-row__label">Série</span>
          <span>kg</span>
          <span>Reps</span>
          <span>RPE</span>
        </div>
      ) : null}
      {rows.map((row, i) => {
        if (!loaded) {
          return (
            <label key={i} className="toggle set-row__check">
              <input
                type="checkbox"
                checked={row.done}
                disabled={finished}
                aria-label={`Série ${i + 1} faite, ${name}`}
                onChange={(ev) => onChange(i, { done: ev.target.checked })}
              />
              {e.group === 'A' ? `Tour ${i + 1} fait` : `Série ${i + 1} faite`}
            </label>
          )
        }
        const wave = waves?.[i]
        const hint = setLoad(i)
        return (
          <div key={i}>
            {wave ? (
              <p className="wave-row" data-testid={`vague-${e.exerciseId}-${i + 1}`}>
                <span>Série {i + 1}</span>
                <span>{waveLabel(wave)}</span>
                <span className="wave-row__kg">{hint ? `${text(hint.kg)} kg` : wave.toMax ? 'le plus lourd possible' : ''}</span>
              </p>
            ) : null}
            <div className={isFilled(row) ? 'set-row set-row--filled' : 'set-row'}>
              <span className="set-row__label">
                <span className="visually-hidden">Série </span>
                {i + 1}
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={hint ? text(hint.kg) : ''}
                aria-label={`Charge série ${i + 1}, ${name} (kg)`}
                value={row.load}
                disabled={finished}
                onChange={(ev) => onChange(i, { load: ev.target.value })}
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder={targetReps(e, i)}
                aria-label={`Répétitions série ${i + 1}, ${name}`}
                value={row.reps}
                disabled={finished}
                onChange={(ev) => onChange(i, { reps: ev.target.value })}
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder={text(wave?.rpe ?? e.prescription.targetRpe)}
                aria-label={`RPE série ${i + 1}, ${name}`}
                value={row.rpe}
                disabled={finished}
                onChange={(ev) => onChange(i, { rpe: ev.target.value })}
              />
            </div>
          </div>
        )
      })}
    </section>
  )
}

/** En-tête d'un bloc ATP : lettre, titre, récupération et superset. */
function BlockHeader({ letter, exercises }: { letter: BlockLetter; exercises: PrescribedExercise[] }) {
  const rest = exercises.find((e) => e.restSec)?.restSec
  const superset = exercises.length > 1 && letter !== 'A'
  const strength = letter === 'C' ? getExercise(exercises[0]!.exerciseId)?.name : null
  const title = `${letter} · ${superset ? 'Superset' : BLOCK_TITLES[letter]}${strength ? ` · ${strength}` : ''}`
  return (
    <div className="block-head">
      <h2 className="block-head__title">{title}</h2>
      <p className="meta">
        {letter === 'A' ? '3 tours' : null}
        {rest ? `récup ${formatRest(rest)}` : null}
        {letter === 'F' || exercises.every((e) => e.optional) ? ' · facultatif' : ''}
      </p>
    </div>
  )
}

function SessionForm({ session, weekStart, log }: { session: Session; weekStart: string; log: SessionLog | null }) {
  const navigate = useNavigate()
  const maxes = usePlayerMaxes(session.id)
  const finished = log?.status === 'terminee'
  const [state, setState] = useState<FormState>(() => initialState(session, log))
  const latest = useRef(state)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const [saveError, setSaveError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [rpeText, setRpeText] = useState('')
  const [durationText, setDurationText] = useState(String(session.durationMin))
  const [finishError, setFinishError] = useState<string | null>(null)

  const draftOf = (s: FormState): SessionLogDraft => ({
    sessionId: session.id,
    date: session.date,
    weekStart,
    title: session.title,
    warmupDone: s.warmupDone,
    sets: toLoggedSets(session, s),
  })

  /** Enregistre chaque modification (en file, dans l'ordre) : rien n'est perdu si l'appli se ferme. */
  function update(next: FormState) {
    latest.current = next
    setState(next)
    chain.current = chain.current
      .then(() => saveSessionLog(draftOf(next)))
      .then(() => setSaveError(null))
      .catch(() => setSaveError('Enregistrement impossible sur cet appareil.'))
  }

  function setField(exerciseId: string, index: number, patch: Partial<SetDraft>) {
    const rows = (latest.current.sets[exerciseId] ?? []).map((row, i) => (i === index ? { ...row, ...patch } : row))
    update({ ...latest.current, sets: { ...latest.current.sets, [exerciseId]: rows } })
  }

  async function finish() {
    const rpe = parseDecimal(rpeText)
    const duration = parseDecimal(durationText)
    if (rpe === null || rpe > 10) {
      setFinishError('Indique un RPE de séance entre 0 et 10.')
      return
    }
    if (duration === null || duration <= 0) {
      setFinishError('Indique la durée de la séance en minutes.')
      return
    }
    try {
      await chain.current
      await finishSessionLog(draftOf(latest.current), { sessionRpe: rpe, durationMin: Math.round(duration) })
      void navigate('/')
    } catch {
      setFinishError('Enregistrement impossible sur cet appareil.')
    }
  }

  const warmupSteps = session.warmup.steps ?? getWarmup(session.warmup.version).steps
  // Les exercices facultatifs (finisher) ne comptent pas dans la progression de la séance.
  const allRows = session.exercises.filter((e) => !e.optional).flatMap((e) => state.sets[e.exerciseId] ?? [])
  const totalSets = allRows.length
  const filledSets = allRows.filter(isFilled).length
  const grouped = session.exercises.some((e) => e.group)

  const card = (e: PrescribedExercise, label: string) => (
    <ExerciseCard
      key={e.exerciseId}
      exercise={e}
      label={label}
      rows={state.sets[e.exerciseId] ?? []}
      maxes={maxes}
      finished={finished}
      onChange={(i, patch) => setField(e.exerciseId, i, patch)}
    />
  )

  return (
    <section className="screen session">
      <Link className="session__back" to="/">
        <Icon name="arrowLeft" size={18} />
        Quitter
      </Link>
      <h1>{session.title}</h1>
      <div className="chips">
        <span className="chip">
          <Icon name="clock" size={16} />
          {session.durationMin} min
        </span>
        <span className="chip">
          <Icon name="barbell" size={16} />
          {session.exercises.length} exercices
        </span>
        {session.programWeek ? <span className="chip">Intersaison · S{session.programWeek}/9</span> : null}
        {session.deload ? <span className="chip">Semaine allégée</span> : null}
        {session.optional ? <span className="chip">Facultative</span> : null}
      </div>
      <div className="session-progress">
        <div
          className="session-progress__bar"
          role="progressbar"
          aria-label="Séries saisies"
          aria-valuemin={0}
          aria-valuemax={totalSets}
          aria-valuenow={filledSets}
        >
          <span style={{ width: `${totalSets === 0 ? 0 : (filledSets / totalSets) * 100}%` }} />
        </div>
        <span className="session-progress__count">
          {filledSets}/{totalSets} séries
        </span>
      </div>
      {session.tests && session.tests.length > 0 ? (
        <p className="banner banner--info" role="note">
          Séance de tests : {session.tests.map((t) => getRecordTest(t).label).join(', ')}. <Link to="/records">Note tes résultats dans Records</Link> pour
          calculer tes charges et suivre ton bilan.
        </p>
      ) : null}
      {session.reasons.length > 0 ? (
        <ul className="reason-list">
          {session.reasons.map((r) => (
            <li key={r.code} className="reason">
              ⓘ {r.text}
            </li>
          ))}
        </ul>
      ) : null}
      {finished ? (
        <p className="banner banner--info" role="status">
          Séance terminée · RPE {text(log?.sessionRpe ?? null)} · {log?.durationMin} min
        </p>
      ) : null}
      {saveError ? <p className="form-error">{saveError}</p> : null}

      <section className={state.warmupDone ? 'card warmup warmup--done' : 'card warmup'} aria-labelledby="h-warmup">
        <div className="warmup__head">
          <span className="warmup__icon">
            <Icon name="flame" size={20} />
          </span>
          <div>
            <h2 id="h-warmup">Échauffement Activate</h2>
            <p className="meta">{session.warmup.durationMin} min</p>
          </div>
        </div>
        <label className="toggle warmup__done">
          <input
            type="checkbox"
            checked={state.warmupDone}
            disabled={finished}
            onChange={(e) => update({ ...latest.current, warmupDone: e.target.checked })}
          />
          Échauffement fait
        </label>
        <details>
          <summary>Voir les étapes</summary>
          <ol>
            {warmupSteps.map((step) => (
              <li key={step.id}>
                <strong>{step.title}</strong> ({step.durationMin} min) : {step.instructions}
                {' '}
                <span className="muted">{step.exerciseIds.map((id) => getExercise(id)?.name ?? id).join(', ')}</span>
              </li>
            ))}
          </ol>
        </details>
      </section>

      {grouped
        ? LETTERS.map((letter) => {
            const list = session.exercises.filter((e) => e.group === letter)
            if (list.length === 0) return null
            const cards = list.map((e, i) => card(e, list.length > 1 ? `${letter}${i + 1}` : letter))
            if (letter === 'F' || list.every((e) => e.optional)) {
              return (
                <details key={letter} className="block block--optional">
                  <summary>
                    <BlockHeader letter={letter} exercises={list} />
                  </summary>
                  {cards}
                </details>
              )
            }
            return (
              <div key={letter} className={list.length > 1 && letter !== 'A' ? 'block block--superset' : 'block'}>
                <BlockHeader letter={letter} exercises={list} />
                {cards}
              </div>
            )
          })
        : session.exercises.map((e, index) => card(e, String(index + 1)))}

      {!finished ? (
        <section className="finish">
          {finishing ? (
            <div className="card">
              <h2 className="eyebrow">Fin de séance</h2>
              <div className="field">
                <label htmlFor="session-rpe">RPE de la séance (0 à 10)</label>
                <input
                  id="session-rpe"
                  type="text"
                  inputMode="decimal"
                  value={rpeText}
                  onChange={(e) => setRpeText(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="session-duration">Durée (minutes)</label>
                <input
                  id="session-duration"
                  type="text"
                  inputMode="numeric"
                  value={durationText}
                  onChange={(e) => setDurationText(e.target.value)}
                />
              </div>
              {finishError ? (
                <p className="form-error" role="alert">
                  {finishError}
                </p>
              ) : null}
              <button type="button" className="btn" onClick={() => void finish()}>
                Enregistrer la séance
              </button>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setFinishing(true)}>
              Terminer · RPE séance
            </button>
          )}
        </section>
      ) : (
        <Link className="btn" to="/">
          Retour à l’accueil
        </Link>
      )}
    </section>
  )
}

export default function SessionScreen() {
  const { id } = useParams()
  const found = useSessionById(id)

  if (found === undefined) {
    return (
      <section className="screen">
        <h1>Séance</h1>
        <p className="muted">Chargement…</p>
      </section>
    )
  }
  if (found === null) {
    return (
      <section className="screen">
        <h1>Séance</h1>
        <p className="muted">Cette séance est introuvable. Elle a peut-être été remplacée après un changement de calendrier.</p>
        <Link className="btn" to="/semaine">
          Voir la semaine
        </Link>
      </section>
    )
  }
  return <SessionForm key={found.session.id} session={found.session} weekStart={found.weekStart} log={found.log} />
}

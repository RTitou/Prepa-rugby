import { useState } from 'react'
import { Link } from 'react-router'
import { useClubDays, useSessionRating } from '../../data/hooks'
import { todayLocal } from '../../data/ids'
import { saveSessionRating, type RatingInput } from '../../data/repositories/wellnessRepo'
import { MATCH_DEFAULT_DURATION_MIN, MINUTES_FULL_MATCH, MINUTES_PARTIAL_MATCH } from '../../engine/config'
import { weekdayOf } from '../../engine/dates'
import { dateLong } from '../../lib/format'
import {
  CONTACT_MAX,
  CONTACT_MIN,
  MINUTES_PLAYED_BANDS,
  RATING_RPE_MAX,
  RATING_RPE_MIN,
  type RatingKind,
  type SessionRating,
} from '../../types/wellness'

const RPE_VALUES = Array.from({ length: RATING_RPE_MAX - RATING_RPE_MIN + 1 }, (_, i) => RATING_RPE_MIN + i)
const CONTACT_VALUES = Array.from({ length: CONTACT_MAX - CONTACT_MIN + 1 }, (_, i) => CONTACT_MIN + i)

/** Plage correspondant aux minutes enregistrées (les valeurs hors plage tombent dans la plage la plus proche). */
function bandIndex(minutes: number | null): number | null {
  if (minutes === null) return null
  if (minutes <= 0) return 0
  if (minutes < MINUTES_PARTIAL_MATCH) return 1
  if (minutes < MINUTES_FULL_MATCH) return 2
  return 3
}

function Form({ kind, date, existing, defaultDuration }: { kind: RatingKind; date: string; existing: SessionRating | null; defaultDuration: number }) {
  const [duration, setDuration] = useState(String(existing?.durationMin ?? defaultDuration))
  const [rpe, setRpe] = useState<number | null>(existing?.rpe ?? null)
  const [band, setBand] = useState<number | null>(bandIndex(existing?.minutesPlayed ?? null))
  const [contact, setContact] = useState<number | null>(existing?.contactIntensity ?? null)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>(existing ? 'saved' : 'idle')
  const [message, setMessage] = useState('')

  const future = date > todayLocal()

  function parsedDuration(): number | null {
    const n = Number(duration.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }

  async function save(changes: Omit<RatingInput, 'kind' | 'date'>) {
    try {
      await saveSessionRating({ kind, date, ...changes })
      setStatus('saved')
      setMessage('')
    } catch {
      setStatus('error')
      setMessage('Enregistrement impossible sur cet appareil.')
    }
  }

  // Un geste : toucher la dureté enregistre la note avec la durée pré-remplie.
  function chooseRpe(value: number) {
    const d = parsedDuration()
    if (d === null) {
      setStatus('error')
      setMessage('Indique la durée en minutes.')
      return
    }
    setRpe(value)
    void save({ rpe: value, durationMin: d })
  }

  function changeDuration() {
    const d = parsedDuration()
    if (rpe !== null && d !== null) void save({ durationMin: d })
  }

  function chooseBand(index: number) {
    setBand(index)
    void save({ minutesPlayed: MINUTES_PLAYED_BANDS[index]!.minutes })
  }

  function toggleContact(value: number) {
    const next = contact === value ? null : value
    setContact(next)
    void save({ contactIntensity: next })
  }

  const isMatch = kind === 'match'
  return (
    <section className="screen">
      <h1>{isMatch ? 'Note du match' : 'Note de la séance de club'}</h1>
      <p className="muted">{dateLong(date)}</p>
      {future ? (
        <p className="banner banner--info">Tu pourras la saisir une fois la séance passée.</p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="rating-duration">Durée (min)</label>
            <input
              id="rating-duration"
              type="number"
              inputMode="numeric"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onBlur={changeDuration}
            />
          </div>
          <fieldset className="field-group scale">
            <legend>Dureté de la séance, de 1 (très facile) à 10 (effort maximal)</legend>
            <div className="scale__row scale__row--wrap">
              {RPE_VALUES.map((n) => (
                <label key={n} className={`scale__btn${rpe === n ? ' scale__btn--selected' : ''}`}>
                  <input type="radio" name="rpe" checked={rpe === n} aria-label={`Dureté ${n} sur 10`} onChange={() => chooseRpe(n)} />
                  <span aria-hidden="true">{n}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {isMatch ? (
            <>
              <fieldset className="field-group">
                <legend>Minutes jouées</legend>
                {MINUTES_PLAYED_BANDS.map((b, i) => (
                  <label key={b.label} className={`choice${band === i ? ' choice--selected' : ''}`}>
                    <input type="radio" name="minutes" checked={band === i} onChange={() => chooseBand(i)} />
                    <span className="choice__label">{b.label}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset className="field-group scale">
                <legend>Intensité des contacts, de 1 (faible) à 5 (très forte) · facultatif</legend>
                <div className="scale__row">
                  {CONTACT_VALUES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`scale__btn${contact === n ? ' scale__btn--selected' : ''}`}
                      aria-pressed={contact === n}
                      aria-label={`Contacts ${n} sur 5`}
                      onClick={() => toggleContact(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}
          {status === 'saved' ? (
            <p className="form-ok" role="status">
              Enregistré ✓
            </p>
          ) : null}
          {status === 'error' ? <p className="form-error">{message}</p> : null}
        </>
      )}
      <Link className="btn btn--ghost" to="/semaine">
        Retour à la semaine
      </Link>
    </section>
  )
}

/** Note de dureté (CR-10) d'une séance club ou d'un match ; minutes jouées et contacts pour un match. */
export default function RatingForm({ kind, date }: { kind: RatingKind; date: string }) {
  const existing = useSessionRating(date, kind)
  const clubDays = useClubDays()
  if (existing === undefined || clubDays === undefined) {
    return (
      <section className="screen">
        <h1>{kind === 'match' ? 'Note du match' : 'Note de la séance de club'}</h1>
        <p className="muted">Chargement…</p>
      </section>
    )
  }
  const weekday = weekdayOf(date)
  const defaultDuration = kind === 'match' ? MATCH_DEFAULT_DURATION_MIN : (clubDays.find((c) => c.weekday === weekday)?.durationMin ?? 90)
  return <Form kind={kind} date={date} existing={existing} defaultDuration={defaultDuration} />
}

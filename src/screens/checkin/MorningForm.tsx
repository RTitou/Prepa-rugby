import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMorningWellness } from '../../data/hooks'
import { todayLocal } from '../../data/ids'
import { saveMorningWellness } from '../../data/repositories/wellnessRepo'
import { dateLong } from '../../lib/format'
import { BODY_ZONES, type BodyZone } from '../../types/reference'
import { WELLNESS_ITEMS, type MorningWellness, type WellnessItemKey, type WellnessScores } from '../../types/wellness'

type Draft = Partial<WellnessScores>

function isComplete(draft: Draft): draft is WellnessScores {
  return WELLNESS_ITEMS.every((i) => draft[i.key] !== undefined)
}

function Form({ date, existing }: { date: string; existing: MorningWellness | null }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Draft>(existing?.scores ?? {})
  const [zone, setZone] = useState<BodyZone | ''>(existing?.painZone ?? '')
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>(existing ? 'saved' : 'idle')

  // Enregistrement dès que les cinq notes sont données : cinq touches suffisent, « Valider » confirme la zone et revient à l'accueil.
  async function commit(scores: Draft, painZone: BodyZone | ''): Promise<boolean> {
    if (!isComplete(scores)) return false
    try {
      await saveMorningWellness({ date, scores, painZone: painZone === '' ? null : painZone })
      setStatus('saved')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }

  function choose(key: WellnessItemKey, value: number) {
    const next = { ...draft, [key]: value }
    setDraft(next)
    setStatus('idle')
    void commit(next, zone)
  }

  function chooseZone(value: BodyZone | '') {
    setZone(value)
    setStatus('idle')
    void commit(draft, value)
  }

  async function validate() {
    if (await commit(draft, zone)) void navigate('/')
  }

  const complete = isComplete(draft)

  return (
    <section className="screen">
      <h1>Ressenti</h1>
      <p className="muted">
        {dateLong(date)} · 5 touches. Pour chaque ligne, 5 est le meilleur état (en forme, bien dormi, sans douleur, serein, de bonne humeur).
      </p>
      {WELLNESS_ITEMS.map((item) => (
        <fieldset key={item.key} className="field-group scale">
          <legend>{item.label}</legend>
          <div className="scale__row">
            <span className="scale__end muted">{item.low}</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={`scale__btn${draft[item.key] === n ? ' scale__btn--selected' : ''}`}>
                <input
                  type="radio"
                  name={item.key}
                  checked={draft[item.key] === n}
                  aria-label={`${item.label} ${n} sur 5`}
                  onChange={() => choose(item.key, n)}
                />
                <span aria-hidden="true">{n}</span>
              </label>
            ))}
            <span className="scale__end muted">{item.high}</span>
          </div>
        </fieldset>
      ))}
      <div className="field">
        <label htmlFor="pain-zone">Douleur localisée ? (facultatif)</label>
        <select id="pain-zone" value={zone} onChange={(e) => chooseZone(e.target.value as BodyZone | '')}>
          <option value="">Aucune douleur localisée</option>
          {BODY_ZONES.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </div>
      {status === 'saved' ? (
        <p className="form-ok" role="status">
          Ressenti enregistré ✓
        </p>
      ) : null}
      {status === 'error' ? <p className="form-error">Enregistrement impossible sur cet appareil.</p> : null}
      <button type="button" className="btn" disabled={!complete} onClick={() => void validate()}>
        Valider
      </button>
    </section>
  )
}

/** Ressenti du matin (RC-6.2) : 5 items de 1 à 5, 5 = meilleur état, douleur localisée facultative. */
export default function MorningForm() {
  const date = todayLocal()
  const existing = useMorningWellness(date)
  if (existing === undefined) {
    return (
      <section className="screen">
        <h1>Ressenti</h1>
        <p className="muted">Chargement…</p>
      </section>
    )
  }
  return <Form date={date} existing={existing} />
}

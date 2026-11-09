import { useState } from 'react'
import { Link } from 'react-router'
import { useInjuries } from '../../data/hooks'
import { todayLocal } from '../../data/ids'
import { declareInjury, healInjury } from '../../data/repositories/injuryRepo'
import { MEDICAL_DISCLAIMER, PHYSIO_REVIEW_NOTICE } from '../../engine/injuries/suspension'
import { dateLong } from '../../lib/format'
import { SEVERE_SIGNS } from '../../reference/substitutions/table'
import type { Injury } from '../../types/injury'
import { BODY_ZONES, type BodyZone } from '../../types/reference'
import { ConsultationBanner, SuspensionBanner } from './InjuryNotices'

function zoneLabel(zone: BodyZone): string {
  return BODY_ZONES.find((z) => z.value === zone)?.label ?? zone
}

function DeclareForm() {
  const [zone, setZone] = useState<BodyZone | ''>('')
  const [date, setDate] = useState(todayLocal())
  const [signs, setSigns] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  function toggle(id: string) {
    setSigns((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]))
  }

  async function submit() {
    if (zone === '') {
      setMessage({ kind: 'error', text: 'Choisis la zone de la blessure.' })
      return
    }
    if (date === '') {
      setMessage({ kind: 'error', text: 'Indique la date.' })
      return
    }
    try {
      await declareInjury({ zone, declaredOn: date, severeSigns: signs, comment })
      setMessage({ kind: 'ok', text: 'Blessure déclarée : tes prochaines séances sont adaptées.' })
      setZone('')
      setSigns([])
      setComment('')
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Déclaration impossible.' })
    }
  }

  return (
    <section className="card" aria-labelledby="h-declarer">
      <h2 id="h-declarer">Déclarer une blessure</h2>
      <div className="field">
        <label htmlFor="injury-zone">Zone de la blessure</label>
        <select id="injury-zone" value={zone} onChange={(e) => setZone(e.target.value as BodyZone | '')}>
          <option value="">Choisir…</option>
          {BODY_ZONES.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="injury-date">Date</label>
        <input id="injury-date" type="date" max={todayLocal()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <fieldset className="field-group">
        <legend>Un de ces signes graves ?</legend>
        {SEVERE_SIGNS.map((s) => (
          <label key={s.id} className={`choice${signs.includes(s.id) ? ' choice--selected' : ''}`}>
            <input type="checkbox" checked={signs.includes(s.id)} onChange={() => toggle(s.id)} />
            <span className="choice__label">{s.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="injury-comment">Commentaire (facultatif)</label>
        <textarea id="injury-comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      {message ? (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'form-error' : 'form-ok'}>
          {message.text}
        </p>
      ) : null}
      <button type="button" className="btn" onClick={() => void submit()}>
        Déclarer la blessure
      </button>
    </section>
  )
}

function ActiveItem({ injury }: { injury: Injury }) {
  const [error, setError] = useState<string | null>(null)
  const label = zoneLabel(injury.zone)
  const signs = injury.severeSigns.map((id) => SEVERE_SIGNS.find((s) => s.id === id)?.label ?? id)
  async function heal() {
    try {
      await healInjury(injury.id)
    } catch {
      setError('Enregistrement impossible sur cet appareil.')
    }
  }
  return (
    <li className="card">
      <p className="card__title">{label}</p>
      <p className="muted">Déclarée le {dateLong(injury.declaredOn)}</p>
      {signs.length > 0 ? <p className="reason">Signes graves : {signs.join(', ')}</p> : null}
      {injury.comment !== '' ? <p>{injury.comment}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      <button type="button" className="btn btn--ghost" aria-label={`Déclarer guérie : ${label}`} onClick={() => void heal()}>
        Déclarer guérie
      </button>
    </li>
  )
}

export default function InjuriesScreen() {
  const injuries = useInjuries()
  const active = (injuries ?? []).filter((i) => i.status === 'active')
  const history = (injuries ?? []).filter((i) => i.status === 'guerie')

  return (
    <section className="screen">
      <h1>Blessures</h1>
      <p className="muted">{MEDICAL_DISCLAIMER} En cas de doute, consulte un médecin ou un kiné.</p>
      {injuries === undefined ? <p className="muted">Chargement…</p> : null}
      <SuspensionBanner injuries={active} />
      <ConsultationBanner injuries={active} />
      <section aria-labelledby="h-actives">
        <h2 id="h-actives">Blessures actives</h2>
        {injuries !== undefined && active.length === 0 ? <p className="muted">Aucune blessure active : programme normal.</p> : null}
        <ul className="match-list">
          {active.map((i) => (
            <ActiveItem key={i.id} injury={i} />
          ))}
        </ul>
      </section>
      <DeclareForm />
      <section aria-labelledby="h-historique">
        <h2 id="h-historique">Historique</h2>
        {history.length === 0 ? <p className="muted">Aucune blessure guérie.</p> : null}
        <ul className="record-list">
          {history.map((i) => (
            <li key={i.id}>
              <span>{zoneLabel(i.zone)}</span>
              <span className="muted">
                {dateLong(i.declaredOn)} → {i.healedOn ? dateLong(i.healedOn) : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <p className="muted">
        <small>{PHYSIO_REVIEW_NOTICE}</small>
      </p>
      <Link className="btn btn--ghost" to="/">
        Retour à l’accueil
      </Link>
    </section>
  )
}

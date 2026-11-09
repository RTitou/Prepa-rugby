import { useState } from 'react'
import { Link } from 'react-router'
import { useClubDays, useLatestRecords, useMatches, useProfile } from '../../data/hooks'
import { todayLocal } from '../../data/ids'
import { removeMatch, setClubDays } from '../../data/repositories/calendarRepo'
import WeekendMatch from '../shared/WeekendMatch'
import { saveProfile, setGoals, setTrainingPhase } from '../../data/repositories/profileRepo'
import GoalsFields, { EMPTY_GOALS, goalsFromDraft, validateGoals, type GoalsDraft } from '../shared/GoalsFields'
import { addDays, mondayOf } from '../../engine/dates'
import { defaultStartMonday, offseasonEnd, programWeek } from '../../engine/season'
import { dateLong } from '../../lib/format'
import { formatRecordValue } from '../../lib/numbers'
import type { Match } from '../../types/calendar'
import { RECORD_TESTS, type PerformanceRecord, type RecordTest } from '../../types/records'
import BackupSection from './BackupSection'
import ClubDaysEditor, { clubDraftsFromDays, clubDraftsToInputs, type ClubDayDraft } from '../shared/ClubDaysEditor'
import { BodyFields, IdentityFields, LevelFields, PositionFields } from '../shared/ProfileFields'
import { draftFromProfile, draftToProfileInput, validateDraft, type ProfileDraft } from '../shared/profileDraft'
import type { Profile } from '../../types/profile'
import type { ClubDay } from '../../types/calendar'

export default function ProfileScreen() {
  const profile = useProfile()
  const clubDays = useClubDays()
  const matches = useMatches(todayLocal())
  const latest = useLatestRecords()

  return (
    <section className="screen settings">
      <h1>Réglages</h1>
      {profile === undefined || clubDays === undefined || matches === undefined || latest === undefined ? (
        <p className="muted">Chargement…</p>
      ) : profile === null ? (
        <p className="muted">Aucun profil : termine d'abord le premier lancement.</p>
      ) : (
        <>
          <ProfileForm profile={profile} />
          <GoalsSection profile={profile} />
          <PhaseSection profile={profile} />
          <ClubForm days={clubDays} />
          <MatchesSection matches={matches} />
          <RecordsSummary latest={latest} />
          <BackupSection />
          <section aria-labelledby="h-blessures" className="settings__section">
            <h2 id="h-blessures">Blessures</h2>
            <p className="muted">Déclare une blessure pour adapter tes séances, ou déclare-la guérie.</p>
            <Link className="btn btn--ghost" to="/blessures">
              Mes blessures
            </Link>
          </section>
        </>
      )}
    </section>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(profile))
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function save() {
    const problem = validateDraft(draft)
    if (problem) {
      setMessage({ kind: 'error', text: problem })
      return
    }
    await saveProfile(draftToProfileInput(draft))
    setMessage({ kind: 'ok', text: 'Profil enregistré.' })
  }

  return (
    <section aria-labelledby="h-profil" className="settings__section">
      <h2 id="h-profil">Profil</h2>
      <IdentityFields draft={draft} onChange={setDraft} />
      <PositionFields draft={draft} onChange={setDraft} />
      <BodyFields draft={draft} onChange={setDraft} />
      <LevelFields draft={draft} onChange={setDraft} />
      <Feedback message={message} />
      <button type="button" className="btn" onClick={() => void save()}>
        Enregistrer le profil
      </button>
    </section>
  )
}

/** Points à améliorer : objectif principal et secondaire, qui orientent les séances à venir. */
function GoalsSection({ profile }: { profile: Profile }) {
  const [draft, setDraft] = useState<GoalsDraft>(() =>
    profile.goals ? { primary: profile.goals.primary, secondary: profile.goals.secondary ?? 'aucun' } : EMPTY_GOALS,
  )
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function save() {
    const problem = validateGoals(draft)
    if (problem) {
      setMessage({ kind: 'error', text: problem })
      return
    }
    await setGoals(goalsFromDraft(draft))
    setMessage({ kind: 'ok', text: 'Objectifs enregistrés : tes séances à venir sont adaptées.' })
  }

  return (
    <section aria-labelledby="h-objectifs" className="settings__section">
      <h2 id="h-objectifs">Ce que tu veux améliorer</h2>
      <GoalsFields value={draft} onChange={setDraft} />
      <Feedback message={message} />
      <button type="button" className="btn" onClick={() => void save()}>
        Enregistrer les objectifs
      </button>
    </section>
  )
}

/** Phase de saison : en saison (placement autour des matchs) ou intersaison ATP de 9 semaines à partir d'un lundi. */
function PhaseSection({ profile }: { profile: Profile }) {
  const today = todayLocal()
  const current = profile.trainingPhase
  const [kind, setKind] = useState<'saison' | 'intersaison'>(current?.kind === 'intersaison' ? 'intersaison' : 'saison')
  const [start, setStart] = useState(current?.kind === 'intersaison' ? current.startMonday : defaultStartMonday(today))
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const week = current?.kind === 'intersaison' ? programWeek(current, mondayOf(today)) : null

  async function save() {
    if (kind === 'intersaison') {
      if (start === '' || mondayOf(start) !== start) {
        setMessage({ kind: 'error', text: 'Choisis un lundi comme départ de l’intersaison.' })
        return
      }
      await setTrainingPhase({ kind: 'intersaison', startMonday: start })
      setMessage({ kind: 'ok', text: 'Intersaison enregistrée : tes semaines suivent la méthode ATP.' })
    } else {
      await setTrainingPhase({ kind: 'saison' })
      setMessage({ kind: 'ok', text: 'En saison : tes semaines à venir sont recalculées, les séances faites restent.' })
    }
  }

  return (
    <section aria-labelledby="h-phase" className="settings__section">
      <h2 id="h-phase">Phase de saison</h2>
      <div className="radio-row" role="radiogroup" aria-label="Phase de saison">
        <label className="toggle">
          <input type="radio" name="phase" checked={kind === 'saison'} onChange={() => setKind('saison')} />
          En saison
        </label>
        <label className="toggle">
          <input type="radio" name="phase" checked={kind === 'intersaison'} onChange={() => setKind('intersaison')} />
          Intersaison
        </label>
      </div>
      {kind === 'intersaison' ? (
        <>
          <div className="field">
            <label htmlFor="phase-start">Départ (un lundi)</label>
            <input id="phase-start" type="date" value={start} step={7} onChange={(e) => setStart(e.target.value)} />
          </div>
          <p className="muted">
            9 semaines : lower, upper, conditioning, accessoire (facultatif), terrain, full body et récupération (facultative). Tests en semaine 1, re-tests en
            semaine 9.
            {start !== '' && mondayOf(start) === start ? ` Fin le ${dateLong(offseasonEnd(start)).toLowerCase()}.` : ''}
          </p>
        </>
      ) : null}
      {week !== null ? <p className="form-ok">Semaine {week} sur 9 en cours.</p> : null}
      <Feedback message={message} />
      <button type="button" className="btn" onClick={() => void save()}>
        Enregistrer la phase
      </button>
    </section>
  )
}

function ClubForm({ days }: { days: ClubDay[] }) {
  const [drafts, setDrafts] = useState<ClubDayDraft[]>(() => clubDraftsFromDays(days))
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function save() {
    const { inputs, error } = clubDraftsToInputs(drafts)
    if (error) {
      setMessage({ kind: 'error', text: error })
      return
    }
    await setClubDays(inputs)
    setMessage({ kind: 'ok', text: 'Entraînements du club enregistrés.' })
  }

  return (
    <section aria-labelledby="h-club" className="settings__section">
      <h2 id="h-club">Entraînements du club</h2>
      <ClubDaysEditor value={drafts} onChange={setDrafts} />
      <Feedback message={message} />
      <button type="button" className="btn" onClick={() => void save()}>
        Enregistrer les entraînements
      </button>
    </section>
  )
}

function MatchesSection({ matches }: { matches: Match[] }) {
  const monday = mondayOf(todayLocal())
  return (
    <section aria-labelledby="h-matchs" className="settings__section">
      <h2 id="h-matchs">Matchs à venir</h2>
      <h3>Cette semaine</h3>
      <WeekendMatch weekStart={monday} />
      <h3>La semaine prochaine</h3>
      <WeekendMatch weekStart={addDays(monday, 7)} />
      {matches.length === 0 ? <p className="muted">Aucun match prévu : semaine sans match.</p> : null}
      <ul className="match-list">
        {matches.map((m) => (
          <li key={m.id} className="match-row">
            <span>{dateLong(m.date)}</span>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => void removeMatch(m.id)}>
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RecordsSummary({ latest }: { latest: Partial<Record<RecordTest, PerformanceRecord>> }) {
  return (
    <section aria-labelledby="h-records" className="settings__section">
      <h2 id="h-records">Records connus</h2>
      <ul className="record-list">
        {RECORD_TESTS.map((def) => {
          const r = latest[def.test]
          return (
            <li key={def.test}>
              <span>{def.label}</span>
              <span className={r ? undefined : 'muted'}>{r ? formatRecordValue(r.value, r.unit, r.reps) : 'Non renseigné'}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Feedback({ message }: { message: { kind: 'ok' | 'error'; text: string } | null }) {
  if (!message) return null
  return (
    <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'form-error' : 'form-ok'}>
      {message.text}
    </p>
  )
}

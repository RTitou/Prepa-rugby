import { useState } from 'react'
import { setClubDays } from '../../data/repositories/calendarRepo'
import { saveProfile } from '../../data/repositories/profileRepo'
import { addRecord } from '../../data/repositories/recordsRepo'
import { RECORD_TESTS } from '../../types/records'
import BackupImport from '../shared/BackupImport'
import GoalsFields, { EMPTY_GOALS, goalsFromDraft, validateGoals, type GoalsDraft } from '../shared/GoalsFields'
import ClubDaysEditor, { clubDraftsToInputs, type ClubDayDraft } from '../shared/ClubDaysEditor'
import { BodyFields, IdentityFields, LevelFields, PositionFields } from '../shared/ProfileFields'
import {
  EMPTY_DRAFT,
  draftToProfileInput,
  validateBody,
  validateIdentity,
  validateLevel,
  validatePosition,
  type ProfileDraft,
} from '../shared/profileDraft'
import { emptyRecordDrafts, recordDraftsToInputs, type RecordDrafts } from './recordsDraft'

const STEP_TITLES = [
  'Qui es-tu ?',
  'Ton poste',
  'Taille et poids',
  'Niveau et musculation',
  'Ce que tu veux améliorer',
  'Tes records connus',
  'Tes jours d’entraînement',
]
const LAST_STEP = STEP_TITLES.length - 1

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT)
  const [records, setRecords] = useState<RecordDrafts>(emptyRecordDrafts)
  const [clubDays, setClubDaysDraft] = useState<ClubDayDraft[]>([])
  const [goals, setGoalsDraft] = useState<GoalsDraft>(EMPTY_GOALS)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function stepError(): string | null {
    switch (step) {
      case 0:
        return validateIdentity(draft)
      case 1:
        return validatePosition(draft)
      case 2:
        return validateBody(draft)
      case 3:
        return validateLevel(draft)
      case 4:
        return validateGoals(goals)
      case 5:
        return recordDraftsToInputs(records).error
      default:
        return clubDraftsToInputs(clubDays).error
    }
  }

  async function next() {
    const problem = stepError()
    setError(problem)
    if (problem) return
    if (step < LAST_STEP) {
      setStep(step + 1)
      return
    }
    setSaving(true)
    try {
      // Le profil est enregistré en dernier : sa présence termine le premier lancement.
      const { inputs: recordInputs } = recordDraftsToInputs(records)
      for (const r of recordInputs) await addRecord(r)
      await setClubDays(clubDraftsToInputs(clubDays).inputs)
      await saveProfile({ ...draftToProfileInput(draft), goals: goalsFromDraft(goals) })
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'enregistrement a échoué. Réessaie.")
      setSaving(false)
    }
  }

  function back() {
    setError(null)
    setStep(Math.max(0, step - 1))
  }

  return (
    <section className="screen onboarding">
      <h1>Bienvenue</h1>
      <p className="muted">
        Étape {step + 1} sur {STEP_TITLES.length}
      </p>
      <progress className="onboarding__progress" max={STEP_TITLES.length} value={step + 1} aria-label="Avancement" />
      <h2>{STEP_TITLES[step]}</h2>

      {step === 0 ? (
        <>
          <IdentityFields draft={draft} onChange={setDraft} />
          <p className="muted">Tu as déjà une sauvegarde (nouvel appareil, réinstallation) ?</p>
          <BackupImport label="Importer ma sauvegarde" />
        </>
      ) : null}
      {step === 1 ? <PositionFields draft={draft} onChange={setDraft} /> : null}
      {step === 2 ? <BodyFields draft={draft} onChange={setDraft} /> : null}
      {step === 3 ? <LevelFields draft={draft} onChange={setDraft} /> : null}
      {step === 4 ? (
        <>
          <p className="muted">Tes séances mettront l’accent sur ton objectif principal, un peu moins sur le secondaire.</p>
          <GoalsFields value={goals} onChange={setGoalsDraft} />
        </>
      ) : null}
      {step === 5 ? <RecordsStep drafts={records} onChange={setRecords} /> : null}
      {step === 6 ? (
        <>
          <p className="muted">
            Coche les jours où tu t’entraînes avec ton club. Les matchs s’ajoutent ensuite d’un bouton sur l’accueil : « Match samedi » ou « Match
            dimanche ».
          </p>
          <ClubDaysEditor value={clubDays} onChange={setClubDaysDraft} />
        </>
      ) : null}

      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : null}

      <div className="onboarding__actions">
        {step > 0 ? (
          <button type="button" className="btn btn--ghost" onClick={back} disabled={saving}>
            Retour
          </button>
        ) : null}
        <button type="button" className="btn" onClick={() => void next()} disabled={saving}>
          {step === LAST_STEP ? 'Terminer' : 'Suivant'}
        </button>
      </div>
    </section>
  )
}

function RecordsStep({ drafts, onChange }: { drafts: RecordDrafts; onChange: (next: RecordDrafts) => void }) {
  return (
    <>
      <p className="muted">
        Tout est facultatif : laisse vide ce que tu ne connais pas, il sera marqué « non renseigné ». Les temps se saisissent en
        secondes (1,85) ou en minutes:secondes (4:45).
      </p>
      {RECORD_TESTS.map((def) => {
        const d = drafts[def.test]
        const patch = (changes: Partial<typeof d>) => onChange({ ...drafts, [def.test]: { ...d, ...changes } })
        return (
          <fieldset key={def.test} className="field-group record-field">
            <legend>{def.label}</legend>
            {def.kind === 'load' ? (
              <div className="field-row">
                <div className="field">
                  <label htmlFor={`${def.test}-load`}>{def.label} : charge (kg)</label>
                  <input
                    id={`${def.test}-load`}
                    type="text"
                    inputMode="decimal"
                    value={d.load}
                    onChange={(e) => patch({ load: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${def.test}-reps`}>{def.label} : répétitions</label>
                  <input
                    id={`${def.test}-reps`}
                    type="text"
                    inputMode="numeric"
                    value={d.reps}
                    onChange={(e) => patch({ reps: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="field">
                <label htmlFor={`${def.test}-time`}>{def.label} : temps</label>
                <input
                  id={`${def.test}-time`}
                  type="text"
                  inputMode="decimal"
                  value={d.time}
                  onChange={(e) => patch({ time: e.target.value })}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor={`${def.test}-date`}>{def.label} : date du test</label>
              <input id={`${def.test}-date`} type="date" value={d.date} onChange={(e) => patch({ date: e.target.value })} />
            </div>
          </fieldset>
        )
      })}
    </>
  )
}

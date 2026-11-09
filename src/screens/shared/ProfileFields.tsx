import { useId } from 'react'
import {
  LIFTING_EXPERIENCES,
  LINE_LABELS,
  PLAY_LEVELS,
  POSITIONS,
  SEXES,
  SUBGROUP_LABELS,
  getPosition,
} from '../../types/profile'
import RadioGroup from './RadioGroup'
import type { ProfileDraft } from './profileDraft'

interface FieldsProps {
  draft: ProfileDraft
  onChange: (next: ProfileDraft) => void
}

export function IdentityFields({ draft, onChange }: FieldsProps) {
  const id = useId()
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-age`}>Âge (en années)</label>
        <input
          id={`${id}-age`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft.age}
          onChange={(e) => onChange({ ...draft, age: e.target.value })}
        />
      </div>
      <RadioGroup
        legend="Sexe"
        name={`${id}-sex`}
        options={SEXES}
        value={draft.sex}
        onChange={(sex) => onChange({ ...draft, sex })}
      />
    </>
  )
}

export function PositionFields({ draft, onChange }: FieldsProps) {
  const id = useId()
  const info = draft.position === null ? null : getPosition(draft.position)
  return (
    <>
      <RadioGroup
        legend="Poste (rugby à XV)"
        name={`${id}-position`}
        options={POSITIONS.map((p) => ({ value: p.number, label: `N°${p.number} · ${p.label}` }))}
        value={draft.position}
        onChange={(position) => onChange({ ...draft, position })}
      />
      {info ? (
        <p className="muted">
          {LINE_LABELS[info.line]} · {SUBGROUP_LABELS[info.subgroup]}
        </p>
      ) : null}
    </>
  )
}

export function BodyFields({ draft, onChange }: FieldsProps) {
  const id = useId()
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-h`}>Taille (cm)</label>
        <input
          id={`${id}-h`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft.heightCm}
          onChange={(e) => onChange({ ...draft, heightCm: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-w`}>Poids (kg)</label>
        <input
          id={`${id}-w`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={draft.weightKg}
          onChange={(e) => onChange({ ...draft, weightKg: e.target.value })}
        />
      </div>
    </>
  )
}

export function LevelFields({ draft, onChange }: FieldsProps) {
  const id = useId()
  return (
    <>
      <RadioGroup
        legend="Niveau de jeu"
        name={`${id}-level`}
        options={PLAY_LEVELS}
        value={draft.level}
        onChange={(level) => onChange({ ...draft, level })}
      />
      <RadioGroup
        legend="Expérience en musculation"
        name={`${id}-exp`}
        options={LIFTING_EXPERIENCES}
        value={draft.experience}
        onChange={(experience) => onChange({ ...draft, experience })}
      />
    </>
  )
}

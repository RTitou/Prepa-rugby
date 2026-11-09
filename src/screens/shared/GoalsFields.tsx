import { TRAINING_GOALS, type TrainingGoal } from '../../types/profile'
import RadioGroup from './RadioGroup'

export interface GoalsDraft {
  primary: TrainingGoal | ''
  secondary: TrainingGoal | 'aucun'
}

export const EMPTY_GOALS: GoalsDraft = { primary: '', secondary: 'aucun' }

/** Message d'erreur, ou null si les objectifs sont valides. */
export function validateGoals(d: GoalsDraft): string | null {
  if (d.primary === '') return 'Choisis ton objectif principal.'
  if (d.secondary === d.primary) return 'L’objectif secondaire doit être différent du principal.'
  return null
}

export function goalsFromDraft(d: GoalsDraft): { primary: TrainingGoal; secondary: TrainingGoal | null } {
  return { primary: d.primary as TrainingGoal, secondary: d.secondary === 'aucun' ? null : d.secondary }
}

/** Objectif principal (obligatoire) puis secondaire (facultatif, différent du principal). */
export default function GoalsFields({ value, onChange }: { value: GoalsDraft; onChange: (next: GoalsDraft) => void }) {
  const secondaryOptions = [
    ...TRAINING_GOALS.filter((g) => g.value !== value.primary).map((g) => ({ value: g.value, label: g.label })),
    { value: 'aucun' as const, label: 'Aucun' },
  ]
  return (
    <>
      <RadioGroup<TrainingGoal>
        legend="Ton objectif principal"
        name="goal-primary"
        options={TRAINING_GOALS}
        value={value.primary}
        onChange={(primary) => onChange({ primary, secondary: value.secondary === primary ? 'aucun' : value.secondary })}
      />
      <RadioGroup<TrainingGoal | 'aucun'>
        legend="Ton objectif secondaire"
        name="goal-secondary"
        options={secondaryOptions}
        value={value.secondary}
        onChange={(secondary) => onChange({ ...value, secondary })}
      />
    </>
  )
}

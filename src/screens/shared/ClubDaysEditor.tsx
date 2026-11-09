import { parseDecimal } from '../../lib/numbers'
import { DEFAULT_CLUB_DURATION_MIN, WEEKDAYS, type ClubDay, type ClubDayInput, type Weekday } from '../../types/calendar'

/** Jour club en cours de saisie (durée en texte). */
export interface ClubDayDraft {
  weekday: Weekday
  intensity: ClubDay['intensity']
  durationMin: string
}

export function clubDraftsFromDays(days: ClubDay[]): ClubDayDraft[] {
  return days.map((d) => ({ weekday: d.weekday, intensity: d.intensity, durationMin: String(d.durationMin) }))
}

/** Convertit les brouillons ; message d'erreur si une durée est invalide. */
export function clubDraftsToInputs(drafts: ClubDayDraft[]): { inputs: ClubDayInput[]; error: string | null } {
  const inputs: ClubDayInput[] = []
  for (const d of drafts) {
    const minutes = parseDecimal(d.durationMin)
    if (minutes === null || !Number.isInteger(minutes) || minutes < 15 || minutes > 300) {
      const label = WEEKDAYS.find((w) => w.value === d.weekday)!.label.toLowerCase()
      return { inputs: [], error: `Durée du ${label} : indique des minutes entre 15 et 300.` }
    }
    inputs.push({ weekday: d.weekday, intensity: d.intensity, durationMin: minutes })
  }
  return { inputs, error: null }
}

interface Props {
  value: ClubDayDraft[]
  onChange: (next: ClubDayDraft[]) => void
}

/**
 * Jours d'entraînement au club : le joueur coche seulement les jours. Un nouveau jour vaut un entraînement normal de
 * 90 min ; un jour déjà enregistré garde son intensité et sa durée.
 */
export default function ClubDaysEditor({ value, onChange }: Props) {
  const selected = new Set(value.map((d) => d.weekday))

  function toggle(weekday: Weekday, on: boolean) {
    if (on) onChange([...value, { weekday, intensity: 'normal', durationMin: String(DEFAULT_CLUB_DURATION_MIN) }])
    else onChange(value.filter((d) => d.weekday !== weekday))
  }

  return (
    <div className="club-days club-days--chips" role="group" aria-label="Jours d'entraînement au club">
      {WEEKDAYS.map((w) => (
        <label key={w.value} className={selected.has(w.value) ? 'day-chip day-chip--on' : 'day-chip'}>
          <input type="checkbox" checked={selected.has(w.value)} onChange={(e) => toggle(w.value, e.target.checked)} />
          <span>{w.label}</span>
        </label>
      ))}
    </div>
  )
}

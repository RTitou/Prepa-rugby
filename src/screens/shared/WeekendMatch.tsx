import { useState } from 'react'
import { useMatches } from '../../data/hooks'
import { todayLocal } from '../../data/ids'
import { addMatch, removeMatch } from '../../data/repositories/calendarRepo'
import { addDays } from '../../engine/dates'
import { dayMonthShort } from '../../lib/format'

/**
 * Match du week-end en un geste : « Match samedi » ou « Match dimanche » de la semaine du lundi `weekStart`.
 * Un seul match par week-end : choisir l'autre jour déplace le match ; toucher le jour choisi le retire.
 * Les jours passés ne se modifient plus.
 */
export default function WeekendMatch({ weekStart }: { weekStart: string }) {
  const today = todayLocal()
  const saturday = addDays(weekStart, 5)
  const sunday = addDays(weekStart, 6)
  const matches = useMatches(saturday)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const weekend = (matches ?? []).filter((m) => m.date === saturday || m.date === sunday)

  async function choose(date: string) {
    setBusy(true)
    setError(null)
    try {
      const already = weekend.find((m) => m.date === date)
      for (const m of weekend) await removeMatch(m.id)
      if (!already) await addMatch({ date, time: null })
    } catch {
      setError('Enregistrement impossible sur cet appareil.')
    } finally {
      setBusy(false)
    }
  }

  const button = (date: string, label: string) => {
    const on = weekend.some((m) => m.date === date)
    return (
      <button
        type="button"
        className={on ? 'btn btn--small match-btn match-btn--on' : 'btn btn--ghost btn--small match-btn'}
        aria-pressed={on}
        disabled={busy || matches === undefined || date < today}
        onClick={() => void choose(date)}
      >
        {on ? '✓ ' : ''}
        {label} <span className="match-btn__date">{dayMonthShort(date)}</span>
      </button>
    )
  }

  return (
    <div className="weekend-match" role="group" aria-label="Match du week-end">
      {button(saturday, 'Match samedi')}
      {button(sunday, 'Match dimanche')}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}

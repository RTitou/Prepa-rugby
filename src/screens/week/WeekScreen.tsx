import { useState } from 'react'
import { Link } from 'react-router'
import { useSessionRatings, useWeekPlan } from '../../data/hooks'
import { todayLocal } from '../../data/ids'
import { addDays, mondayOf } from '../../engine/dates'
import Icon from '../../components/Icon'
import { DAY_KIND_LABEL, dayMonthShort, dayTone, weekdayShort } from '../../lib/format'
import type { DayPlan } from '../../types/plan'
import type { RatingKind } from '../../types/wellness'
import WeekendMatch from '../shared/WeekendMatch'

function dayTitle(day: DayPlan): string {
  if (day.kind === 'match') return day.match?.time ? `MATCH · ${day.match.time}` : 'MATCH'
  const session = day.session
  if (day.club) {
    const club = DAY_KIND_LABEL[day.kind]
    return session ? `${club} + ${session.title}` : club
  }
  return session ? session.title : DAY_KIND_LABEL[day.kind]
}

function DayRow({ day, today, rated }: { day: DayPlan; today: string; rated: ReadonlySet<RatingKind> }) {
  const session = day.session
  const isClub = day.club !== null
  const isMatch = day.kind === 'match'
  const classes = ['day-row', `day-row--${dayTone(day.kind)}`, day.date === today ? 'day-row--today' : ''].filter(Boolean).join(' ')
  const title = dayTitle(day)
  const details = [day.mdLabel, session ? `${session.durationMin} min` : null, session?.optional ? 'facultative' : null].filter(Boolean).join(' · ')
  return (
    <li className={classes} aria-current={day.date === today ? 'date' : undefined}>
      <div className="day-row__date">
        <span className="day-row__day">{weekdayShort(day.date)}</span>
        <span className="day-row__num">{Number(day.date.slice(8))}</span>
      </div>
      <div className="day-row__main">
        <span className="day-row__title">
          {session ? (
            <Link to={`/seance/${session.id}`}>
              {title}
              <Icon name="chevronRight" size={18} />
            </Link>
          ) : (
            title
          )}
        </span>
        {details ? <small className="muted">{details}</small> : null}
        {day.reasons.map((r) => (
          <small key={r.code} className="muted">
            ⓘ {r.text}
          </small>
        ))}
      </div>
      <div className="day-row__actions">
        {session?.status === 'faite' ? (
          <span className="chip chip--done">✓ Faite</span>
        ) : null}
        {isMatch ? (
          <Link className="btn btn--ghost btn--small" to={`/ressenti?type=match&date=${day.date}`}>
            Minutes · note{rated.has('match') ? ' ✓' : ''}
          </Link>
        ) : isClub ? (
          <Link className="btn btn--ghost btn--small" to={`/ressenti?type=club&date=${day.date}`}>
            Note{rated.has('club') ? ' ✓' : ''}
          </Link>
        ) : null}
      </div>
    </li>
  )
}

export default function WeekScreen() {
  const today = todayLocal()
  const [offset, setOffset] = useState(0)
  const weekStart = addDays(mondayOf(today), offset * 7)
  const { loading, plan } = useWeekPlan(weekStart)
  const ratings = useSessionRatings(weekStart, addDays(weekStart, 6))
  const ratedByDate = new Map<string, Set<RatingKind>>()
  for (const r of ratings ?? []) {
    if (r.rpe === null && r.minutesPlayed === null) continue
    ratedByDate.set(r.date, (ratedByDate.get(r.date) ?? new Set()).add(r.kind))
  }
  // Adaptations de la semaine (ressenti, charge) qui ne sont pas déjà affichées sur un jour précis.
  const dayCodes = new Set(plan?.days.flatMap((d) => d.reasons.map((r) => r.code)))
  const weekReasons = new Map<string, string>()
  for (const d of plan?.days ?? []) {
    for (const r of d.session?.reasons ?? []) {
      if ((r.source === 'ressenti' || r.source === 'charge') && !dayCodes.has(r.code)) weekReasons.set(r.code, r.text)
    }
  }

  return (
    <section className="screen">
      <h1>Semaine</h1>
      <div className="week-nav">
        <button type="button" className="icon-btn" aria-label="Semaine précédente" onClick={() => setOffset(offset - 1)}>
          <Icon name="chevronLeft" />
        </button>
        <div className="week-nav__center">
          <span className="week-nav__label">Semaine du {dayMonthShort(weekStart)}</span>
          {offset === 0 ? <span className="eyebrow">Cette semaine</span> : null}
        </div>
        <button type="button" className="icon-btn" aria-label="Semaine suivante" onClick={() => setOffset(offset + 1)}>
          <Icon name="chevronRight" />
        </button>
      </div>
      <WeekendMatch weekStart={weekStart} />
      {plan?.isDeload ? <p className="banner banner--info">Semaine allégée : volume réduit pour récupérer.</p> : null}
      {plan?.flags.map((f) => (
        <p key={f.code + f.dates.join()} className="banner banner--warn">
          {f.text}
        </p>
      ))}
      {[...weekReasons].map(([code, text]) => (
        <p key={code} className="banner banner--info">
          {text}
        </p>
      ))}
      {loading ? <p className="muted">Préparation de la semaine…</p> : null}
      {!loading && plan === null ? <p className="muted">Aucune donnée pour cette semaine.</p> : null}
      {plan ? (
        <ul className="week-list">
          {plan.days.map((d) => (
            <DayRow key={d.date} day={d} today={today} rated={ratedByDate.get(d.date) ?? new Set()} />
          ))}
        </ul>
      ) : null}
      <Link className="btn btn--ghost" to="/profil">
        Modifier mon calendrier
      </Link>
    </section>
  )
}

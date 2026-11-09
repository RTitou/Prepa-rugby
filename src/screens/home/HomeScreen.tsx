import { Link } from 'react-router'
import Icon from '../../components/Icon'
import Sparkline from '../../components/Sparkline'
import { useMorningWellness, useProfile, useRecordsAnalysis, useWeekPlan } from '../../data/hooks'
import { programWeek } from '../../engine/season'
import WeekendMatch from '../shared/WeekendMatch'
import { todayLocal } from '../../data/ids'
import { mondayOf } from '../../engine/dates'
import { totalScore } from '../../engine/load/wellnessScore'
import { DAY_KIND_LABEL, dateLong, dayMonthShort, dayTone, weekdayShort } from '../../lib/format'
import { formatRecordValue } from '../../lib/numbers'
import BackupReminder from './BackupReminder'
import InjuryBanners from '../injuries/InjuryNotices'
import type { DayPlan, PlanReason } from '../../types/plan'

/** Raisons d'adaptation (ressenti, charge, blessure) du jour : celles de la séance puis du jour, sans doublon. */
function adaptationReasons(day: DayPlan): PlanReason[] {
  const all = [...(day.session?.reasons ?? []), ...day.reasons].filter((r) => r.source === 'ressenti' || r.source === 'charge' || r.source === 'blessure')
  return all.filter((r, i) => all.findIndex((o) => o.code === r.code && o.text === r.text) === i)
}

function Adaptation({ reasons }: { reasons: PlanReason[] }) {
  if (reasons.length === 0) return null
  return (
    <div className="banner banner--info adaptation" role="note" aria-label="Adaptation de ta séance">
      <strong>Séance adaptée</strong>
      <ul className="adaptation__list">
        {reasons.map((r) => (
          <li key={r.code + r.text}>{r.text}</li>
        ))}
      </ul>
    </div>
  )
}

/** Frise des 7 jours de la semaine, raccourci vers l'écran Semaine. */
function WeekStrip({ days, today }: { days: DayPlan[]; today: string }) {
  return (
    <Link className="week-strip" to="/semaine" aria-label="Voir ma semaine">
      {days.map((d) => {
        const isToday = d.date === today
        const done = d.session?.status === 'faite'
        const label = `${weekdayShort(d.date)} : ${DAY_KIND_LABEL[d.kind]}${done ? ', faite' : ''}${isToday ? ", aujourd'hui" : ''}`
        return (
          <span
            key={d.date}
            className={`week-strip__day week-strip__day--${dayTone(d.kind)}${isToday ? ' week-strip__day--today' : ''}`}
            title={label}
          >
            <span aria-hidden="true">{weekdayShort(d.date).charAt(0)}</span>
            <span className="week-strip__bar" />
            <span className="week-strip__done" aria-hidden="true">
              {done ? '✓' : ''}
            </span>
            <span className="visually-hidden">{label}</span>
          </span>
        )
      })}
    </Link>
  )
}

function TodayCard({ day }: { day: DayPlan | undefined }) {
  if (!day) return <p className="muted">Aucune séance prévue aujourd’hui.</p>
  const session = day.session
  if (!session) {
    const label = DAY_KIND_LABEL[day.kind]
    return (
      <>
        <p className="card__title">{label}</p>
        <p className="muted">
          {day.kind === 'match' ? 'Bon match !' : day.kind.startsWith('club') ? 'Pas de séance en plus aujourd’hui.' : 'Aucune séance prévue aujourd’hui.'}
        </p>
        {day.reasons.slice(0, 2).map((r) => (
          <p key={r.code} className="reason">
            ⓘ {r.text}
          </p>
        ))}
      </>
    )
  }
  const done = session.status === 'faite'
  const adaptation = adaptationReasons(day)
  const others = session.reasons.filter((r) => !adaptation.includes(r)).slice(0, 2)
  return (
    <>
      <p className="card__title">{session.title}</p>
      <p className="meta">
        <Icon name="clock" size={16} />
        {session.durationMin} min{session.optional ? ' · facultative' : ''}
      </p>
      {done ? <p className="done-mark">Séance faite ✓</p> : null}
      <Link className={done ? 'btn btn--ghost' : 'btn'} to={`/seance/${session.id}`}>
        {done ? 'Revoir la séance' : 'Commencer'}
      </Link>
      <Adaptation reasons={adaptation} />
      {others.map((r) => (
        <p key={r.code} className="reason">
          ⓘ {r.text}
        </p>
      ))}
    </>
  )
}

function WellnessCard({ today }: { today: string }) {
  const morning = useMorningWellness(today)
  return (
    <section className="card" aria-labelledby="h-ressenti">
      <h2 id="h-ressenti" className="eyebrow">
        Ressenti du jour
      </h2>
      {morning ? (
        <>
          <p className="stat">
            {totalScore(morning.scores)}
            <span className="stat__unit">/25</span>
          </p>
          <p className="done-mark">Ressenti enregistré ✓</p>
          <Link className="text-link" to="/ressenti">
            Modifier
          </Link>
        </>
      ) : (
        <>
          <p className="stat">
            –<span className="stat__unit">/25</span>
          </p>
          <p className="reason">Quelques questions pour adapter ta semaine.</p>
          <Link className="btn btn--small" to="/ressenti">
            Remplir · 30 s
          </Link>
        </>
      )}
    </section>
  )
}

function ProgressionCard() {
  const analysis = useRecordsAnalysis()
  const last = analysis?.series[0]
  return (
    <section className="card" aria-labelledby="h-progression">
      <h2 id="h-progression" className="eyebrow">
        Progression
      </h2>
      {last ? (
        <>
          <p className="reason">
            Dernier record : {last.label} ({dayMonthShort(last.latest.date)})
          </p>
          <p className="stat">{formatRecordValue(last.latest.value, last.latest.unit, last.latest.reps)}</p>
          <Sparkline values={last.curve} label={`Courbe ${last.label}`} lowerIsBetter={last.lowerIsBetter} />
          {analysis?.orientation ? <p className="reason">Point faible : {analysis.orientation.weakness}, séances orientées.</p> : null}
        </>
      ) : (
        <p className="reason">Ajoute un record pour voir ta courbe de progression.</p>
      )}
      <Link className="text-link" to="/records">
        Mes records
      </Link>
    </section>
  )
}

export default function HomeScreen() {
  const today = todayLocal()
  const { loading, plan } = useWeekPlan(mondayOf(today))
  const day = plan?.days.find((d) => d.date === today)
  const profile = useProfile()
  const offseasonWeek = profile ? programWeek(profile.trainingPhase, mondayOf(today)) : null

  return (
    <section className="screen">
      <h1>Accueil</h1>
      <p className="muted">
        Bonjour · {dateLong(today)}
        {day?.mdLabel ? ` · ${day.mdLabel}` : ''}
      </p>
      {offseasonWeek !== null ? (
        <p className="banner banner--info phase-banner" role="status">
          Intersaison · semaine {offseasonWeek} sur 9
        </p>
      ) : null}
      {plan ? <WeekStrip days={plan.days} today={today} /> : null}
      <WeekendMatch weekStart={mondayOf(today)} />
      <InjuryBanners />
      <BackupReminder />
      <section className="card card--hero" aria-labelledby="h-seance-jour">
        <h2 id="h-seance-jour" className="eyebrow">
          Séance du jour
        </h2>
        {loading ? <p className="muted">Préparation de ta semaine…</p> : <TodayCard day={day} />}
        <Link className="text-link" to="/blessures">
          <Icon name="bandage" size={18} />
          Déclarer une blessure
        </Link>
      </section>
      <div className="stat-grid">
        <WellnessCard today={today} />
        <ProgressionCard />
      </div>
    </section>
  )
}

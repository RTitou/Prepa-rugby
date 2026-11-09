import { useSearchParams } from 'react-router'
import { todayLocal } from '../../data/ids'
import MorningForm from './MorningForm'
import RatingForm from './RatingForm'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Saisies rapides. Sans paramètre : ressenti du matin. Avec `?type=club|match&date=AAAA-MM-JJ` : note de dureté de la séance
 * (et minutes jouées pour un match).
 */
export default function CheckinScreen() {
  const [params] = useSearchParams()
  const type = params.get('type')
  const rawDate = params.get('date')
  const date = rawDate !== null && DATE_RE.test(rawDate) ? rawDate : todayLocal()
  if (type === 'club' || type === 'match') return <RatingForm key={`${type}-${date}`} kind={type} date={date} />
  return <MorningForm />
}

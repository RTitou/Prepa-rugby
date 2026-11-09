import { Link } from 'react-router'
import { useInjuries } from '../../data/hooks'
import { MEDICAL_DISCLAIMER, evaluateSuspension } from '../../engine/injuries/suspension'
import { getSubstitutionRule } from '../../reference/substitutions/table'
import type { Injury } from '../../types/injury'

/** Bandeau de renvoi médical quand le plan est suspendu (commotion ou signe grave) : délai World Rugby et rappel. */
export function SuspensionBanner({ injuries }: { injuries: readonly Injury[] }) {
  const s = evaluateSuspension(injuries)
  if (!s.suspended) return null
  return (
    <div className="banner banner--warn" role="alert" aria-label="Plan suspendu">
      <div>
        <strong>Plan suspendu</strong>
        {s.messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
        {s.minDaysBeforePlaying !== null ? <p>Délai minimal avant de rejouer : {s.minDaysBeforePlaying} jours (protocole World Rugby).</p> : null}
        <p>Consulte un médecin. {MEDICAL_DISCLAIMER}</p>
        <p className="muted">Le plan reprend uniquement quand tu déclares la blessure guérie.</p>
      </div>
    </div>
  )
}

/** Message de consultation de chaque blessure active (texte de la table de substitution). */
export function ConsultationBanner({ injuries }: { injuries: readonly Injury[] }) {
  const active = injuries.filter((i) => i.status === 'active' && !getSubstitutionRule(i.zone).suspend)
  if (active.length === 0) return null
  return (
    <div className="banner banner--info" role="note" aria-label="Blessure active">
      <div>
        <strong>Blessure active</strong>
        <ul className="adaptation__list">
          {active.map((i) => {
            const rule = getSubstitutionRule(i.zone)
            return (
              <li key={i.id}>
                {rule.label} : {rule.message}
                {rule.medicalAdvice ? ` ${rule.medicalAdvice}` : ''}
              </li>
            )
          })}
        </ul>
        <p className="muted">{MEDICAL_DISCLAIMER}</p>
        <Link to="/blessures">Gérer mes blessures</Link>
      </div>
    </div>
  )
}

/** Bandeaux d'accueil liés aux blessures (ils ne comptent pas comme un bloc de l'accueil). */
export default function InjuryBanners() {
  const injuries = useInjuries()
  if (!injuries) return null
  const active = injuries.filter((i) => i.status === 'active')
  return (
    <>
      <SuspensionBanner injuries={active} />
      <ConsultationBanner injuries={active} />
    </>
  )
}

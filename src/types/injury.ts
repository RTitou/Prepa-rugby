import type { BodyZone } from './reference'
import type { SyncFields } from './sync'

/** active : la blessure pèse sur le plan ; guerie : déclarée guérie par le joueur (seul retour au programme normal). */
export type InjuryStatus = 'active' | 'guerie'

/** Blessure déclarée (table injuries). */
export interface Injury extends SyncFields {
  zone: BodyZone
  status: InjuryStatus
  /** Date de déclaration (AAAA-MM-JJ). */
  declaredOn: string
  /** Date de guérison déclarée (AAAA-MM-JJ), null tant que la blessure est active. */
  healedOn: string | null
  /** Identifiants des signes graves cochés (voir SEVERE_SIGNS). */
  severeSigns: string[]
  /** Commentaire libre du joueur (peut être vide). */
  comment: string
}

/** Données saisies pour déclarer une blessure. */
export interface InjuryInput {
  zone: BodyZone
  declaredOn: string
  severeSigns: string[]
  comment?: string
}

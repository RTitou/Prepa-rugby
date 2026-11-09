import { parseDecimal } from '../../lib/numbers'
import {
  MIN_AGE,
  type LiftingExperience,
  type PlayLevel,
  type PositionNumber,
  type Profile,
  type ProfileInput,
  type Sex,
} from '../../types/profile'

/** Valeurs en cours de saisie (textes des champs). */
export interface ProfileDraft {
  age: string
  sex: Sex | ''
  position: PositionNumber | null
  heightCm: string
  weightKg: string
  level: PlayLevel | ''
  experience: LiftingExperience | ''
}

export const EMPTY_DRAFT: ProfileDraft = {
  age: '',
  sex: '',
  position: null,
  heightCm: '',
  weightKg: '',
  level: '',
  experience: '',
}

export const MINOR_MESSAGE = `Cette application est réservée aux joueurs de ${MIN_AGE} ans et plus. Reviens quand tu auras ${MIN_AGE} ans.`

export function draftFromProfile(p: Profile): ProfileDraft {
  return {
    age: String(p.age),
    sex: p.sex,
    position: p.position,
    heightCm: String(p.heightCm),
    weightKg: String(p.weightKg).replace('.', ','),
    level: p.level,
    experience: p.liftingExperience,
  }
}

/** Message d'erreur pour la partie âge et sexe, ou null. */
export function validateIdentity(d: ProfileDraft): string | null {
  const age = parseDecimal(d.age)
  if (age === null || !Number.isInteger(age)) return 'Indique ton âge en années, par exemple 27.'
  if (age < MIN_AGE) return MINOR_MESSAGE
  if (age > 80) return 'Indique un âge réaliste (80 ans maximum).'
  if (d.sex === '') return 'Choisis homme ou femme.'
  return null
}

export function validatePosition(d: ProfileDraft): string | null {
  return d.position === null ? 'Choisis ton poste.' : null
}

export function validateBody(d: ProfileDraft): string | null {
  const h = parseDecimal(d.heightCm)
  if (h === null || h < 140 || h > 230) return 'Indique ta taille en centimètres, entre 140 et 230.'
  const w = parseDecimal(d.weightKg)
  if (w === null || w < 45 || w > 200) return 'Indique ton poids en kilos, entre 45 et 200.'
  return null
}

export function validateLevel(d: ProfileDraft): string | null {
  if (d.level === '') return 'Choisis ton niveau de jeu.'
  if (d.experience === '') return 'Indique ton expérience en musculation.'
  return null
}

/** Première erreur de tout le brouillon, ou null. */
export function validateDraft(d: ProfileDraft): string | null {
  return validateIdentity(d) ?? validatePosition(d) ?? validateBody(d) ?? validateLevel(d)
}

/** Convertit un brouillon valide en profil. Lève une erreur si le brouillon est invalide. */
export function draftToProfileInput(d: ProfileDraft): ProfileInput {
  const error = validateDraft(d)
  if (error) throw new Error(error)
  return {
    age: parseDecimal(d.age)!,
    sex: d.sex as Sex,
    position: d.position!,
    heightCm: parseDecimal(d.heightCm)!,
    weightKg: parseDecimal(d.weightKg)!,
    level: d.level as PlayLevel,
    liftingExperience: d.experience as LiftingExperience,
  }
}

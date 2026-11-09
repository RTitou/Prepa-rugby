import { db } from '../src/data/db'
import { saveProfile } from '../src/data/repositories/profileRepo'
import type { ProfileInput } from '../src/types/profile'

/** Vide la base fake-indexeddb (et la rouvre) entre deux tests. */
export async function resetDb(): Promise<void> {
  db.close()
  await db.delete()
  await db.open()
}

export const SAMPLE_PROFILE: ProfileInput = {
  age: 27,
  sex: 'homme',
  position: 9,
  heightCm: 178,
  weightKg: 82,
  level: 'federale',
  liftingExperience: '6-24-mois',
}

export async function seedProfile(): Promise<void> {
  await saveProfile(SAMPLE_PROFILE)
}

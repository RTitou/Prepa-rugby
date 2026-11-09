import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/data/db'
import { addMatch, removeMatch, setClubDays } from '../../src/data/repositories/calendarRepo'
import {
  ensureWeekPlan,
  getWeekPlan,
  planStatus,
  registerPlanContextProvider,
} from '../../src/data/repositories/planRepo'
import { finishSessionLog, getSessionLog, saveSessionLog } from '../../src/data/repositories/sessionLogRepo'
import { addDays } from '../../src/engine/dates'
import { resetDb, seedProfile } from '../helpers'

const WEEK = '2026-10-05'

async function seedCalendar(matchDate = '2026-10-10') {
  await setClubDays([
    { weekday: 2, intensity: 'lourd', durationMin: 90 },
    { weekday: 4, intensity: 'normal', durationMin: 90 },
  ])
  return addMatch({ date: matchDate, time: null })
}

beforeEach(async () => {
  await resetDb()
  await seedProfile()
})

describe('génération et stockage des semaines', () => {
  it('génère la semaine absente puis la réutilise tant que les entrées sont identiques', async () => {
    await seedCalendar()
    expect((await planStatus(WEEK, WEEK)).needsGeneration).toBe(true)
    const first = await ensureWeekPlan(WEEK, WEEK)
    expect(first?.days).toHaveLength(7)
    expect(first?.days.filter((d) => d.session?.kind === 'muscu')).toHaveLength(2)
    expect(await db.plans.count()).toBe(1)

    const again = await ensureWeekPlan(WEEK, addDays(WEEK, 1))
    expect(again?.id).toBe(first?.id)
    expect(again?.generatedAt).toBe(first?.generatedAt)
    expect((await planStatus(WEEK, WEEK)).needsGeneration).toBe(false)
    expect(await db.plans.count()).toBe(1)
  })

  it('ne génère pas une semaine entièrement passée', async () => {
    await seedCalendar()
    expect(await ensureWeekPlan('2026-09-28', WEEK)).toBeNull()
    expect(await getWeekPlan('2026-09-28')).toBeNull()
    expect((await planStatus('2026-09-28', WEEK)).needsGeneration).toBe(false)
  })

  it('génère une semaine future à la demande', async () => {
    await seedCalendar()
    const future = await ensureWeekPlan('2026-10-12', WEEK)
    expect(future?.weekStart).toBe('2026-10-12')
    expect(future?.hasMatch).toBe(false)
  })

  it('détecte un changement de calendrier et régénère en gardant la séance faite', async () => {
    const match = await seedCalendar()
    const plan = await ensureWeekPlan(WEEK, WEEK)
    const monday = plan!.days[0]!.session!
    expect(monday.kind).toBe('muscu')

    const draft = { sessionId: monday.id, date: monday.date, weekStart: WEEK, title: monday.title, warmupDone: true, sets: [] }
    await saveSessionLog(draft)
    await finishSessionLog(draft, { sessionRpe: 7, durationMin: 55 })

    // Le match passe de samedi à mercredi.
    await removeMatch(match.id)
    await addMatch({ date: '2026-10-07', time: null })
    expect((await planStatus(WEEK, '2026-10-06')).needsGeneration).toBe(true)

    const regenerated = await ensureWeekPlan(WEEK, '2026-10-06')
    expect(regenerated?.id).toBe(plan?.id)
    expect(await db.plans.count()).toBe(1)
    const mondayAfter = regenerated!.days[0]!
    expect(mondayAfter.session?.id).toBe(monday.id)
    expect(mondayAfter.session?.status).toBe('faite')
    expect(mondayAfter.locked).toBe(true)
    expect(regenerated!.days[2]!.kind).toBe('match')
    expect(regenerated!.days[2]!.mdLabel).toBe('MD')
    // Une séance déjà faite compte dans les deux prévues : une seule reste à placer.
    const remaining = regenerated!.days.slice(1).filter((d) => d.session?.kind === 'muscu')
    expect(remaining).toHaveLength(1)
    expect((await planStatus(WEEK, '2026-10-06')).needsGeneration).toBe(false)
  })

  it('compte la semaine allégée depuis le début du suivi, quel que soit l’ordre de génération', async () => {
    await seedCalendar()
    await ensureWeekPlan(WEEK, WEEK)
    const fifth = await ensureWeekPlan(addDays(WEEK, 28), WEEK)
    expect(fifth?.isDeload).toBe(true)
    const fourth = await ensureWeekPlan(addDays(WEEK, 21), WEEK)
    expect(fourth?.isDeload).toBe(false)
    const next = await ensureWeekPlan(addDays(WEEK, 35), WEEK)
    expect(next?.isDeload).toBe(false)
  })
})

describe('journal de séance', () => {
  it('enregistre un brouillon puis la fin de séance, et marque la séance faite dans la semaine', async () => {
    await seedCalendar()
    const plan = await ensureWeekPlan(WEEK, WEEK)
    const session = plan!.days[2]!.session!
    const draft = {
      sessionId: session.id,
      date: session.date,
      weekStart: WEEK,
      title: session.title,
      warmupDone: true,
      sets: [{ exerciseId: 'back-squat', setIndex: 1, loadKg: 102.5, reps: 5, rpe: 8, done: false }],
    }
    await saveSessionLog(draft)
    await saveSessionLog({
      ...draft,
      sets: [...draft.sets, { exerciseId: 'back-squat', setIndex: 2, loadKg: 105, reps: 5, rpe: 8.5, done: false }],
    })
    const rows = await db.sessionLogs.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]!.status).toBe('en-cours')
    expect(rows[0]!.sets).toHaveLength(2)

    await expect(finishSessionLog(draft, { sessionRpe: 11, durationMin: 50 })).rejects.toThrow()
    const done = await finishSessionLog(draft, { sessionRpe: 7.5, durationMin: 50 })
    expect(done.status).toBe('terminee')
    expect((await getSessionLog(session.id, session.date))?.sessionRpe).toBe(7.5)
    const stored = await getWeekPlan(WEEK)
    expect(stored!.days[2]!.session?.status).toBe('faite')
    expect(stored!.days[2]!.session?.logId).toBe(done.id)
    expect(await db.sessionLogs.count()).toBe(1)
  })
})

describe('points d’extension', () => {
  it('un fournisseur de contexte change l’empreinte et le contenu de la semaine', async () => {
    await seedCalendar()
    const plan = await ensureWeekPlan(WEEK, WEEK)
    expect(plan!.days.some((d) => d.session)).toBe(true)

    const unregister = registerPlanContextProvider(async () => ({ suspended: true }))
    try {
      expect((await planStatus(WEEK, WEEK)).needsGeneration).toBe(true)
      const suspended = await ensureWeekPlan(WEEK, WEEK)
      expect(suspended!.days.every((d) => d.session === null)).toBe(true)
    } finally {
      unregister()
    }
    expect((await planStatus(WEEK, WEEK)).needsGeneration).toBe(true)
    const restored = await ensureWeekPlan(WEEK, WEEK)
    expect(restored!.days.some((d) => d.session)).toBe(true)
  })
})

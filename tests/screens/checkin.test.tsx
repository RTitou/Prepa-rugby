import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { registerAdaptation } from '../../src/data/adaptation'
import { db } from '../../src/data/db'
import { addMatch, setClubDays } from '../../src/data/repositories/calendarRepo'
import { getWeekPlan } from '../../src/data/repositories/planRepo'
import { getMorningWellness, getSessionRating, saveMorningWellness } from '../../src/data/repositories/wellnessRepo'
import { addDays } from '../../src/engine/dates'
import { resetDb, seedProfile } from '../helpers'

const TODAY = '2026-10-07' // mercredi

let unregister: () => void = () => {}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0, 0))
  await resetDb()
  await seedProfile()
  await setClubDays([
    { weekday: 2, intensity: 'lourd', durationMin: 90 },
    { weekday: 4, intensity: 'normal', durationMin: 60 },
  ])
  await addMatch({ date: '2026-10-03', time: null })
  await addMatch({ date: '2026-10-10', time: null })
  // 14 jours de ressenti normal : la base individuelle existe
  for (let i = 14; i >= 1; i--) {
    const v = i % 2 === 0 ? 4 : 5
    await saveMorningWellness({ date: addDays(TODAY, -i), scores: { fatigue: v, sommeil: v, douleurs: v, stress: v, humeur: v }, painZone: null })
  }
  unregister = registerAdaptation()
})

afterEach(() => {
  unregister()
  vi.useRealTimers()
})

const ITEMS = ['Fatigue', 'Sommeil', 'Douleurs', 'Stress', 'Humeur']

async function answerAll(user: ReturnType<typeof userEvent.setup>, value: number) {
  for (const item of ITEMS) await user.click(await screen.findByRole('radio', { name: `${item} ${value} sur 5` }))
}

describe('ressenti du matin', () => {
  it('se remplit en cinq touches, s’enregistre et coche le bloc de l’accueil', async () => {
    const user = userEvent.setup()
    renderAt('/')
    expect(await screen.findByText(/force bas du corps/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Remplir/ }))
    await answerAll(user, 4)
    expect(await screen.findByText('Ressenti enregistré ✓')).toBeInTheDocument()
    const saved = await getMorningWellness(TODAY)
    expect(saved?.scores).toEqual({ fatigue: 4, sommeil: 4, douleurs: 4, stress: 4, humeur: 4 })
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    const card = (await screen.findByRole('heading', { name: 'Ressenti du jour' })).closest('section')!
    expect(await within(card).findByText('Ressenti enregistré ✓')).toBeInTheDocument()
    expect(within(card).queryByRole('link', { name: /Remplir/ })).not.toBeInTheDocument()
    // état normal : aucune adaptation affichée
    expect(screen.queryByRole('note', { name: /Adaptation/ })).not.toBeInTheDocument()
  })

  it('enregistre une douleur localisée et remplace la saisie du jour sans doublon', async () => {
    const user = userEvent.setup()
    renderAt('/ressenti')
    await answerAll(user, 3)
    await user.selectOptions(screen.getByLabelText(/Douleur localisée/), 'genou')
    await waitFor(async () => expect((await getMorningWellness(TODAY))?.painZone).toBe('genou'))
    await user.click(screen.getByRole('radio', { name: 'Humeur 5 sur 5' }))
    await waitFor(async () => expect((await getMorningWellness(TODAY))?.scores.humeur).toBe(5))
    const rows = (await db.wellness.where('date').equals(TODAY).toArray()).filter((r) => r.kind === 'matin')
    expect(rows).toHaveLength(1)
  })

  it('ne propose pas de valider tant que les cinq notes ne sont pas données', async () => {
    const user = userEvent.setup()
    renderAt('/ressenti')
    const validate = await screen.findByRole('button', { name: 'Valider' })
    expect(validate).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Fatigue 4 sur 5' }))
    expect(validate).toBeDisabled()
    expect(await getMorningWellness(TODAY)).toBeUndefined()
  })

  it('ressenti très dégradé : la séance du jour est allégée et l’accueil en donne la raison', async () => {
    const user = userEvent.setup()
    renderAt('/')
    expect(await screen.findByText(/force bas du corps/)).toBeInTheDocument()
    expect(screen.queryByRole('note', { name: /Adaptation/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Remplir/ }))
    await answerAll(user, 1)
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    const note = await screen.findByRole('note', { name: /Adaptation/ })
    expect(note).toHaveTextContent('Ton ressenti du matin est nettement en dessous de ton niveau habituel')
    expect(note).toHaveTextContent('Volume réduit de 40 %')
    // la séance affichée est bien celle du jour, régénérée avec le plafond d'effort
    const today = (await getWeekPlan('2026-10-05'))!.days.find((d) => d.date === TODAY)!
    expect(today.session!.maxRpe ?? 0).toBeLessThan(9)
    expect(today.session!.reasons.some((r) => r.code === 'ressenti-degrade')).toBe(true)
  })
})

describe('note de séance club et de match', () => {
  it('club : durée habituelle pré-remplie, une touche enregistre, une nouvelle touche remplace', async () => {
    const user = userEvent.setup()
    renderAt('/ressenti?type=club&date=2026-10-06')
    expect(await screen.findByRole('heading', { name: 'Note de la séance de club' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Durée (min)')).toHaveValue(90)
    await user.click(await screen.findByRole('radio', { name: 'Dureté 7 sur 10' }))
    await waitFor(async () => expect((await getSessionRating('2026-10-06', 'club'))?.rpe).toBe(7))
    expect((await getSessionRating('2026-10-06', 'club'))?.durationMin).toBe(90)
    await user.click(screen.getByRole('radio', { name: 'Dureté 8 sur 10' }))
    await waitFor(async () => expect((await getSessionRating('2026-10-06', 'club'))?.rpe).toBe(8))
    expect((await db.wellness.where('date').equals('2026-10-06').toArray()).filter((r) => r.kind === 'club')).toHaveLength(1)
    expect(await screen.findByText('Enregistré ✓')).toBeInTheDocument()
  })

  it('match : durée de 80 min, minutes jouées en un geste, contacts facultatifs', async () => {
    const user = userEvent.setup()
    renderAt('/ressenti?type=match&date=2026-10-03')
    expect(await screen.findByRole('heading', { name: 'Note du match' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Durée (min)')).toHaveValue(80)
    await user.click(await screen.findByRole('radio', { name: '20 à 59 min' }))
    await waitFor(async () => expect((await getSessionRating('2026-10-03', 'match'))?.minutesPlayed).toBe(40))
    await user.click(await screen.findByRole('radio', { name: 'Dureté 9 sur 10' }))
    await user.click(screen.getByRole('button', { name: 'Contacts 4 sur 5' }))
    await waitFor(async () => expect((await getSessionRating('2026-10-03', 'match'))?.contactIntensity).toBe(4))
    const rating = await getSessionRating('2026-10-03', 'match')
    expect(rating).toMatchObject({ rpe: 9, durationMin: 80, minutesPlayed: 40, contactIntensity: 4 })
  })

  it('l’écran Semaine envoie vers la bonne saisie et coche les séances notées', async () => {
    const user = userEvent.setup()
    renderAt('/semaine')
    const list = await screen.findByRole('list')
    const rows = await within(list).findAllByRole('listitem')
    expect(within(rows[1]!).getByRole('link', { name: 'Note' }).getAttribute('href')).toBe('/ressenti?type=club&date=2026-10-06')
    expect(within(rows[5]!).getByRole('link', { name: /Minutes · note/ }).getAttribute('href')).toBe('/ressenti?type=match&date=2026-10-10')
    await user.click(within(rows[1]!).getByRole('link', { name: 'Note' }))
    await user.click(await screen.findByRole('radio', { name: 'Dureté 6 sur 10' }))
    await waitFor(async () => expect((await getSessionRating('2026-10-06', 'club'))?.rpe).toBe(6))
    await user.click(screen.getByRole('link', { name: 'Retour à la semaine' }))
    expect(await screen.findByRole('link', { name: 'Note ✓' })).toBeInTheDocument()
  })

  it('match à venir : la saisie est reportée à la fin de la séance', async () => {
    renderAt('/ressenti?type=match&date=2026-10-10')
    expect(await screen.findByText(/une fois la séance passée/)).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Dureté 5 sur 10' })).not.toBeInTheDocument()
  })

  it('10 min jouées saisies après le match : la compensation apparaît le lendemain sur l’écran Semaine', async () => {
    // dimanche 11 octobre, lendemain du match du samedi 10
    vi.setSystemTime(new Date(2026, 9, 11, 9, 0, 0))
    const user = userEvent.setup()
    renderAt('/ressenti?type=match&date=2026-10-10')
    await user.click(await screen.findByRole('radio', { name: 'Moins de 20 min' }))
    await waitFor(async () => expect((await getSessionRating('2026-10-10', 'match'))?.minutesPlayed).toBe(10))
    await user.click(screen.getByRole('link', { name: 'Retour à la semaine' }))
    expect(await screen.findByText('Compensation du match')).toBeInTheDocument()
  })
})

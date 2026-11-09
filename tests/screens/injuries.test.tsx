import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { registerInjuries } from '../../src/data/injuries'
import { addMatch, setClubDays } from '../../src/data/repositories/calendarRepo'
import { listActiveInjuries, listInjuries } from '../../src/data/repositories/injuryRepo'
import { resetDb, seedProfile } from '../helpers'

let unregister: () => void = () => {}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  // Mercredi 7 octobre 2026, 10 h : seule l'horloge Date est simulée.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0, 0))
  await resetDb()
  await seedProfile()
  await setClubDays([
    { weekday: 2, intensity: 'lourd', durationMin: 90 },
    { weekday: 4, intensity: 'normal', durationMin: 90 },
  ])
  await addMatch({ date: '2026-10-10', time: null })
  unregister = registerInjuries()
})

afterEach(() => {
  unregister()
  vi.useRealTimers()
})

async function declare(user: ReturnType<typeof userEvent.setup>, zoneLabel: string, signs: string[] = []) {
  await user.selectOptions(await screen.findByLabelText('Zone de la blessure'), zoneLabel)
  for (const sign of signs) await user.click(screen.getByLabelText(sign))
  await user.click(screen.getByRole('button', { name: 'Déclarer la blessure' }))
}

describe('blessures', () => {
  it('genou : la liste l’affiche, la séance suivante mentionne le remplacement et l’accueil affiche le message', async () => {
    const user = userEvent.setup()
    renderAt('/')
    expect(await screen.findByText(/force bas du corps/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Déclarer une blessure' }))
    await declare(user, 'Genou')

    const actives = (await screen.findByRole('heading', { name: 'Blessures actives' })).closest('section')!
    expect(await within(actives).findByText('Genou')).toBeInTheDocument()
    expect(screen.getByText(/Aucune blessure guérie/)).toBeInTheDocument()
    expect(screen.getByText(/à faire relire par un kiné/)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Retour à l’accueil' }))
    expect(await screen.findByText(/Épargne le genou/)).toBeInTheDocument()
    expect(screen.getByText(/ne remplace pas un avis médical/)).toBeInTheDocument()
    // La séance du jour est régénérée avec les remplacements.
    const start = await screen.findByRole('link', { name: 'Commencer' })
    await vi.waitFor(() => expect(screen.getByText(/Séance adaptée à ta blessure/)).toBeInTheDocument())
    await user.click(start)
    expect((await screen.findAllByText(/remplace Squat arrière \(Genou\)/)).length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Squat arrière' })).not.toBeInTheDocument()
  })

  it('commotion : le plan est suspendu avec renvoi médical et délai minimal, puis guérie rétablit le programme', async () => {
    const user = userEvent.setup()
    renderAt('/blessures')
    await declare(user, 'Tête (commotion)')
    await user.click(await screen.findByRole('link', { name: 'Retour à l’accueil' }))

    const banner = await screen.findByRole('alert', { name: 'Plan suspendu' })
    expect(banner).toHaveTextContent('au moins 21 jours')
    expect(banner).toHaveTextContent('World Rugby')
    expect(banner).toHaveTextContent('ne remplace pas un avis médical')
    await vi.waitFor(() => expect(screen.getByText(/Plan suspendu : aucune séance prévue/)).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: 'Commencer' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Déclarer une blessure' }))
    await user.click(await screen.findByRole('button', { name: 'Déclarer guérie : Tête (commotion)' }))
    expect(await screen.findByText('Aucune blessure active : programme normal.')).toBeInTheDocument()
    expect(await screen.findByText('Tête (commotion)', { selector: 'span' })).toBeInTheDocument()
    expect((await listInjuries())[0]!.healedOn).toBe('2026-10-07')

    await user.click(screen.getByRole('link', { name: 'Retour à l’accueil' }))
    expect(await screen.findByRole('link', { name: 'Commencer' })).toBeInTheDocument()
    expect(screen.queryByRole('alert', { name: 'Plan suspendu' })).not.toBeInTheDocument()
  })

  it('un signe grave coché sur une autre zone suspend aussi le plan', async () => {
    const user = userEvent.setup()
    renderAt('/blessures')
    await declare(user, 'Cheville, pied', ['Impossibilité d’appuyer ou de marcher'])
    expect(await screen.findByRole('alert', { name: 'Plan suspendu' })).toHaveTextContent('Signe grave')
    const [injury] = await listActiveInjuries()
    expect(injury!.severeSigns).toEqual(['appui-impossible'])
  })

  it('genou guéri : les exercices d’origine reviennent', async () => {
    const user = userEvent.setup()
    renderAt('/blessures')
    await declare(user, 'Genou')
    await user.click(await screen.findByRole('button', { name: 'Déclarer guérie : Genou' }))
    expect(await screen.findByText('Aucune blessure active : programme normal.')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Retour à l’accueil' }))
    const start = await screen.findByRole('link', { name: 'Commencer' })
    expect(screen.queryByText(/Épargne le genou/)).not.toBeInTheDocument()
    await user.click(start)
    expect(await screen.findByRole('heading', { name: 'Squat arrière' })).toBeInTheDocument()
    expect(screen.queryByText(/remplace /)).not.toBeInTheDocument()
  })
})

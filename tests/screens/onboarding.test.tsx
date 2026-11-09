import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import { db } from '../../src/data/db'
import { listClubDays, listMatches } from '../../src/data/repositories/calendarRepo'
import { getProfile } from '../../src/data/repositories/profileRepo'
import { listRecords } from '../../src/data/repositories/recordsRepo'
import { resetDb } from '../helpers'

beforeEach(resetDb)

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

type User = ReturnType<typeof userEvent.setup>

async function next(user: User, name = 'Suivant') {
  await user.click(screen.getByRole('button', { name }))
}

/** Étapes 1 à 4 : identité, poste, taille/poids, niveau. */
async function fillProfileSteps(user: User) {
  await user.type(await screen.findByLabelText('Âge (en années)'), '27')
  await user.click(screen.getByLabelText('Homme'))
  await next(user)
  await user.click(await screen.findByLabelText('N°9 · Demi de mêlée'))
  expect(screen.getByText('Arrières · Demis')).toBeInTheDocument()
  await next(user)
  await user.type(await screen.findByLabelText('Taille (cm)'), '178')
  await user.type(screen.getByLabelText('Poids (kg)'), '82,5')
  await next(user)
  await user.click(await screen.findByLabelText(/^Fédérale/))
  await user.click(screen.getByLabelText('De 6 à 24 mois'))
  await next(user)
  // Objectifs : principal obligatoire, secondaire facultatif.
  expect(await screen.findByRole('heading', { name: 'Ce que tu veux améliorer' })).toBeInTheDocument()
  await next(user)
  expect(await screen.findByRole('alert')).toHaveTextContent('objectif principal')
  const primary = screen.getByRole('group', { name: 'Ton objectif principal' })
  await user.click(within(primary).getByLabelText(/^Puissance/))
  const secondary = screen.getByRole('group', { name: 'Ton objectif secondaire' })
  expect(within(secondary).queryByLabelText(/^Puissance/)).not.toBeInTheDocument()
  await user.click(within(secondary).getByLabelText(/^Endurance/))
  await next(user)
}

describe('premier lancement', () => {
  it('redirige vers /bienvenue tant qu\'aucun profil n\'existe', async () => {
    renderApp('/semaine')
    expect(await screen.findByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument()
  })

  it('refuse un joueur de 17 ans avec un message clair', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.type(await screen.findByLabelText('Âge (en années)'), '17')
    await user.click(screen.getByLabelText('Homme'))
    await next(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('réservée aux joueurs de 18 ans et plus')
    expect(screen.getByText('Étape 1 sur 7')).toBeInTheDocument()
    expect(await getProfile()).toBeNull()
  })

  it('finit sans aucun record : profil enregistré, records « non renseigné »', async () => {
    const user = userEvent.setup()
    renderApp()
    await fillProfileSteps(user)
    expect(await screen.findByRole('heading', { name: 'Tes records connus' })).toBeInTheDocument()
    await next(user) // records : tous facultatifs
    await next(user, 'Terminer') // club : aucun jour

    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
    const profile = await getProfile()
    expect(profile).toMatchObject({
      age: 27,
      sex: 'homme',
      position: 9,
      heightCm: 178,
      weightKg: 82.5,
      level: 'federale',
      goals: { primary: 'puissance', secondary: 'endurance' },
    })
    expect(await listRecords()).toEqual([])
    expect(await listMatches()).toEqual([])

    await user.click(screen.getByRole('link', { name: 'Réglages' }))
    const records = await screen.findByRole('region', { name: 'Records connus' })
    expect(within(records).getAllByText('Non renseigné')).toHaveLength(5)
  })

  it('enregistre records et jours d’entraînement (cochés seulement), puis les montre dans les réglages', async () => {
    const user = userEvent.setup()
    renderApp()
    await fillProfileSteps(user)
    await user.type(await screen.findByLabelText('Squat : charge (kg)'), '120')
    await user.clear(screen.getByLabelText('Squat : répétitions'))
    await user.type(screen.getByLabelText('Squat : répétitions'), '5')
    await user.type(screen.getByLabelText('Bronco : temps'), '4:45')
    await next(user)

    // Seulement les jours : ni intensité ni durée à saisir, pas d'étape match.
    await user.click(await screen.findByLabelText('Mardi'))
    await user.click(screen.getByLabelText('Jeudi'))
    expect(screen.queryByLabelText('Intensité du mardi')).not.toBeInTheDocument()
    await next(user, 'Terminer')

    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
    expect((await listClubDays()).map((d) => [d.weekday, d.intensity, d.durationMin])).toEqual([
      [2, 'normal', 90],
      [4, 'normal', 90],
    ])
    expect(await listMatches()).toEqual([])
    expect((await listRecords()).map((r) => [r.test, r.value]).sort()).toEqual([
      ['bronco', 285],
      ['squat', 120],
    ])

    await user.click(screen.getByRole('link', { name: 'Réglages' }))
    const club = await screen.findByRole('region', { name: 'Entraînements du club' })
    expect(within(club).getByLabelText('Mardi')).toBeChecked()
    expect(within(club).getByLabelText('Jeudi')).toBeChecked()
    expect(within(club).getByLabelText('Lundi')).not.toBeChecked()
  })

  it('persiste le profil après « rechargement » de la base', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp()
    await fillProfileSteps(user)
    await next(user)
    await next(user, 'Terminer')
    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
    unmount()

    db.close()
    await db.open()
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
  })
})

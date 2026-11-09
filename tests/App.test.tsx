import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App'
import { resetDb, seedProfile } from './helpers'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await resetDb()
  await seedProfile()
})

describe('App', () => {
  it("affiche l'accueil et la barre de navigation", async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    for (const label of ['Accueil', 'Semaine', 'Records', 'Réglages']) {
      expect(nav).toHaveTextContent(label)
    }
  })

  it("affiche l'écran correspondant à chaque onglet", async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(await screen.findByRole('link', { name: 'Semaine' }))
    expect(screen.getByRole('heading', { name: 'Semaine' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Records' }))
    expect(screen.getByRole('heading', { name: 'Records' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Réglages' }))
    expect(screen.getByRole('heading', { name: 'Réglages' })).toBeInTheDocument()
  })

  it.each([
    ['/seance/abc', 'Séance'],
    ['/ressenti', 'Ressenti'],
    ['/blessures', 'Blessures'],
    ['/profil', 'Réglages'],
  ])('route %s', async (path, title) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
  })

  it('renvoie /bienvenue vers l\'accueil quand le profil existe', async () => {
    renderAt('/bienvenue')
    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
  })
})
